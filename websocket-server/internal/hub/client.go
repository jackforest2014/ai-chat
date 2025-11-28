package hub

import (
	"context"
	"encoding/json"
	"log"
	"time"

	"github.com/gorilla/websocket"
	"github.com/your-org/websocket-server/internal/qamatcher"
	"github.com/your-org/websocket-server/pkg/models"
)

const (
	// Time allowed to write a message to the peer.
	writeWait = 10 * time.Second

	// Time allowed to read the next pong message from the peer.
	pongWait = 60 * time.Second

	// Send pings to peer with this period. Must be less than pongWait.
	pingPeriod = (pongWait * 9) / 10

	// Maximum message size allowed from peer.
	maxMessageSize = 512 * 1024 // 512 KB
)

// Client represents a WebSocket client connection
type Client struct {
	hub       *Hub
	conn      *websocket.Conn
	send      chan []byte
	id        string
	qaMatcher qamatcher.QAMatcher // Q&A matcher for this session
}

// NewClient creates a new client instance
func NewClient(hub *Hub, conn *websocket.Conn, id string) *Client {
	return &Client{
		hub:       hub,
		conn:      conn,
		send:      make(chan []byte, 256),
		id:        id,
		qaMatcher: nil, // Initially no Q&A matcher
	}
}

// SetQAMatcher sets the Q&A matcher for this client
func (c *Client) SetQAMatcher(matcher qamatcher.QAMatcher) {
	c.qaMatcher = matcher
}

// GetQAMatcher returns the Q&A matcher for this client
func (c *Client) GetQAMatcher() qamatcher.QAMatcher {
	return c.qaMatcher
}

// readPump pumps messages from the WebSocket connection to the hub
func (c *Client) readPump() {
	defer func() {
		c.hub.unregister <- c
		c.conn.Close()
	}()

	c.conn.SetReadDeadline(time.Now().Add(pongWait))
	c.conn.SetPongHandler(func(string) error {
		c.conn.SetReadDeadline(time.Now().Add(pongWait))
		return nil
	})

	c.conn.SetReadLimit(maxMessageSize)

	for {
		_, messageBytes, err := c.conn.ReadMessage()
		if err != nil {
			if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
				log.Printf("WebSocket error: %v", err)
			}
			break
		}

		// Parse the message
		var msg models.Message
		if err := json.Unmarshal(messageBytes, &msg); err != nil {
			log.Printf("Error parsing message: %v", err)
			continue
		}

		log.Printf("Received message from client %s: %s", c.id, msg.Content)

		// Try to find a Q&A match first if matcher is loaded
		var response models.Message
		if c.qaMatcher != nil && c.qaMatcher.Count() > 0 {
			ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
			matchResult, err := c.qaMatcher.FindMatch(ctx, msg.Content)
			cancel()

			if err != nil {
				log.Printf("Error finding Q&A match for client %s: %v", c.id, err)
			} else if matchResult.Found {
				// Found a matching Q&A pair
				log.Printf("Q&A match found for client %s (similarity: %.2f): %s", c.id, matchResult.Similarity, matchResult.Question)
				response = models.Message{
					Type:       models.MessageTypeMessage,
					Content:    matchResult.Answer,
					Timestamp:  time.Now(),
					Sender:     "assistant",
					Metadata: map[string]interface{}{
						"from_qa":    true,
						"question":   matchResult.Question,
						"similarity": matchResult.Similarity,
					},
				}
			}
		}

		// If no Q&A match, use default response
		if response.Content == "" {
			response = models.Message{
				Type:      models.MessageTypeMessage,
				Content:   "Server received: " + msg.Content,
				Timestamp: time.Now(),
				Sender:    "assistant",
			}
		}

		responseBytes, err := json.Marshal(response)
		if err != nil {
			log.Printf("Error marshaling response: %v", err)
			continue
		}

		// Send the response to this client
		c.send <- responseBytes
	}
}

// writePump pumps messages from the hub to the WebSocket connection
func (c *Client) writePump() {
	ticker := time.NewTicker(pingPeriod)
	defer func() {
		ticker.Stop()
		c.conn.Close()
	}()

	for {
		select {
		case message, ok := <-c.send:
			c.conn.SetWriteDeadline(time.Now().Add(writeWait))
			if !ok {
				// The hub closed the channel
				c.conn.WriteMessage(websocket.CloseMessage, []byte{})
				return
			}

			w, err := c.conn.NextWriter(websocket.TextMessage)
			if err != nil {
				return
			}
			w.Write(message)

			// Add queued messages to the current WebSocket message
			n := len(c.send)
			for i := 0; i < n; i++ {
				w.Write([]byte{'\n'})
				w.Write(<-c.send)
			}

			if err := w.Close(); err != nil {
				return
			}

		case <-ticker.C:
			c.conn.SetWriteDeadline(time.Now().Add(writeWait))
			if err := c.conn.WriteMessage(websocket.PingMessage, nil); err != nil {
				return
			}
		}
	}
}

// Run starts the client's read and write pumps
func (c *Client) Run() {
	go c.writePump()
	go c.readPump()
}

// Send sends a message to the client's send channel
func (c *Client) Send(message []byte) {
	c.send <- message
}
