package handler

import (
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"log"
	"net/http"
	"time"

	"github.com/gorilla/websocket"
	"github.com/your-org/websocket-server/internal/hub"
	"github.com/your-org/websocket-server/pkg/models"
)

var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
	CheckOrigin: func(r *http.Request) bool {
		// Allow all origins in development
		// In production, you should validate the origin
		return true
	},
}

// WebSocketHandler handles WebSocket upgrade requests
type WebSocketHandler struct {
	hub *hub.Hub
}

// NewWebSocketHandler creates a new WebSocket handler
func NewWebSocketHandler(h *hub.Hub) *WebSocketHandler {
	return &WebSocketHandler{
		hub: h,
	}
}

// HandleWebSocket handles the WebSocket connection
func (wsh *WebSocketHandler) HandleWebSocket(w http.ResponseWriter, r *http.Request) {
	log.Printf("New WebSocket connection request from %s", r.RemoteAddr)

	// Check if connection simulation is active
	if wsh.hub.IsSimulationActive() {
		log.Printf("Rejecting connection from %s - simulation active", r.RemoteAddr)
		http.Error(w, "Service temporarily unavailable - connection simulation active", http.StatusServiceUnavailable)
		return
	}

	// Upgrade HTTP connection to WebSocket
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Printf("Failed to upgrade connection: %v", err)
		return
	}

	// Generate unique client ID
	clientID := generateClientID()

	// Create new client
	client := hub.NewClient(wsh.hub, conn, clientID)

	// Register the client
	wsh.hub.Register(client)

	// Send welcome message with client ID
	welcomeMsg := models.Message{
		Type:      models.MessageTypeSystem,
		Content:   "Connected to WebSocket server",
		Timestamp: time.Now(),
		Metadata: map[string]interface{}{
			"client_id": clientID,
		},
	}

	welcomeBytes, err := json.Marshal(welcomeMsg)
	if err != nil {
		log.Printf("Error marshaling welcome message: %v", err)
	} else {
		client.Send(welcomeBytes)
	}

	// Start client goroutines
	client.Run()

	log.Printf("Client %s connected successfully", clientID)
}

// HandleHealth handles health check requests
func HandleHealth(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]interface{}{
		"status":    "healthy",
		"timestamp": time.Now().Unix(),
	})
}

// HandleStats returns server statistics
func (wsh *WebSocketHandler) HandleStats(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]interface{}{
		"connected_clients": wsh.hub.GetClientCount(),
		"timestamp":         time.Now().Unix(),
	})
}

// HandleSimulateDisconnect simulates connection unavailability for testing
func (wsh *WebSocketHandler) HandleSimulateDisconnect(w http.ResponseWriter, r *http.Request) {
	// Only allow POST requests
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Get duration from query parameter (default 10 seconds)
	durationStr := r.URL.Query().Get("duration")
	duration := 10 * time.Second

	if durationStr != "" {
		parsedDuration, err := time.ParseDuration(durationStr + "s")
		if err != nil {
			http.Error(w, "Invalid duration parameter", http.StatusBadRequest)
			return
		}
		duration = parsedDuration
	}

	// Trigger simulation
	wsh.hub.SimulateDisconnection(duration)

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]interface{}{
		"status":   "simulation_started",
		"duration": duration.Seconds(),
		"message":  "Connection simulation started. All clients disconnected.",
	})
}

// generateClientID generates a random client ID
func generateClientID() string {
	b := make([]byte, 16)
	rand.Read(b)
	return hex.EncodeToString(b)
}
