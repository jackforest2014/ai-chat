package hub

import (
	"log"
	"sync"
	"time"
)

// Hub maintains the set of active clients and broadcasts messages to the clients
type Hub struct {
	// Registered clients
	clients map[*Client]bool

	// Inbound messages from the clients
	broadcast chan []byte

	// Register requests from the clients
	register chan *Client

	// Unregister requests from clients
	unregister chan *Client

	// Mutex for thread-safe operations
	mu sync.RWMutex

	// Connection simulation state
	simulationActive bool
	simulationEnd    time.Time
}

// NewHub creates a new Hub instance
func NewHub() *Hub {
	return &Hub{
		broadcast:  make(chan []byte, 256),
		register:   make(chan *Client),
		unregister: make(chan *Client),
		clients:    make(map[*Client]bool),
	}
}

// Run starts the hub's main loop
func (h *Hub) Run() {
	log.Println("Hub started")
	for {
		select {
		case client := <-h.register:
			h.mu.Lock()
			h.clients[client] = true
			h.mu.Unlock()
			log.Printf("Client %s registered. Total clients: %d", client.id, len(h.clients))

		case client := <-h.unregister:
			h.mu.Lock()
			if _, ok := h.clients[client]; ok {
				delete(h.clients, client)
				close(client.send)
				log.Printf("Client %s unregistered. Total clients: %d", client.id, len(h.clients))
			}
			h.mu.Unlock()

		case message := <-h.broadcast:
			h.mu.RLock()
			for client := range h.clients {
				select {
				case client.send <- message:
				default:
					// Client's send channel is full, close and remove it
					close(client.send)
					delete(h.clients, client)
				}
			}
			h.mu.RUnlock()
		}
	}
}

// BroadcastMessage sends a message to all connected clients
func (h *Hub) BroadcastMessage(message []byte) {
	h.broadcast <- message
}

// GetClientCount returns the number of connected clients
func (h *Hub) GetClientCount() int {
	h.mu.RLock()
	defer h.mu.RUnlock()
	return len(h.clients)
}

// Register registers a new client with the hub
func (h *Hub) Register(client *Client) {
	h.register <- client
}

// Unregister unregisters a client from the hub
func (h *Hub) Unregister(client *Client) {
	h.unregister <- client
}

// SimulateDisconnection simulates connection unavailability for the specified duration
func (h *Hub) SimulateDisconnection(duration time.Duration) {
	h.mu.Lock()
	h.simulationActive = true
	h.simulationEnd = time.Now().Add(duration)
	h.mu.Unlock()

	log.Printf("Starting connection simulation for %v seconds", duration.Seconds())

	// Disconnect all current clients
	h.disconnectAllClients()

	// Auto-restore after duration
	go func() {
		time.Sleep(duration)
		h.mu.Lock()
		h.simulationActive = false
		h.mu.Unlock()
		log.Println("Connection simulation ended, accepting new connections")
	}()
}

// IsSimulationActive checks if connection simulation is currently active
func (h *Hub) IsSimulationActive() bool {
	h.mu.RLock()
	defer h.mu.RUnlock()

	// Double-check time-based expiration
	if h.simulationActive && time.Now().After(h.simulationEnd) {
		h.mu.RUnlock()
		h.mu.Lock()
		h.simulationActive = false
		h.mu.Unlock()
		h.mu.RLock()
	}

	return h.simulationActive
}

// disconnectAllClients forcefully disconnects all connected clients
func (h *Hub) disconnectAllClients() {
	h.mu.Lock()
	defer h.mu.Unlock()

	log.Printf("Disconnecting %d clients for simulation", len(h.clients))

	for client := range h.clients {
		// Close the connection
		client.conn.Close()
		// Remove from clients map
		delete(h.clients, client)
		// Close send channel
		close(client.send)
	}
}

// FindClientByID finds a client by its ID
func (h *Hub) FindClientByID(clientID string) *Client {
	h.mu.RLock()
	defer h.mu.RUnlock()

	for client := range h.clients {
		if client.id == clientID {
			return client
		}
	}
	return nil
}
