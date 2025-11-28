package models

import "time"

// Message represents a WebSocket message
type Message struct {
	Type      string                 `json:"type"`
	SessionID string                 `json:"sessionId,omitempty"`
	Content   string                 `json:"content"`
	Timestamp time.Time              `json:"timestamp,omitempty"`
	Sender    string                 `json:"sender,omitempty"`
	Metadata  map[string]interface{} `json:"metadata,omitempty"` // Additional metadata (e.g., from_qa flag)
}

// MessageType constants
const (
	MessageTypeMessage = "message"
	MessageTypeSystem  = "system"
	MessageTypeError   = "error"
)
