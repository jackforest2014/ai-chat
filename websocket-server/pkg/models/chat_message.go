package models

import (
	"encoding/json"
	"fmt"
	"time"
)

// MessageType represents the type of chat message
type MessageType string

const (
	MessageTypeText  MessageType = "text"
	MessageTypeImage MessageType = "image"
	MessageTypeAudio MessageType = "audio"
	MessageTypeVideo MessageType = "video"
)

// SystemUserID is the user ID used for system messages
const SystemUserID = 10

// ChatMessage represents a chat message in the database
type ChatMessage struct {
	ID          int64           `json:"id"`
	UserID      int             `json:"user_id"`
	ToUserID    int             `json:"to_user_id"`
	MsgType     MessageType     `json:"msg_type"`
	TextContent *string         `json:"text_content,omitempty"`
	Content     []byte          `json:"-"` // Binary content, not directly in JSON
	ContentB64  *string         `json:"content_b64,omitempty"` // Base64 encoded for JSON responses
	Metadata    json.RawMessage `json:"metadata,omitempty"`
	SessionID   *string         `json:"session_id,omitempty"`
	CreatedAt   time.Time       `json:"created_at"`
}

// ChatMessageMetadata contains optional metadata for messages
type ChatMessageMetadata struct {
	// For audio messages
	DurationMs int    `json:"duration_ms,omitempty"`
	MimeType   string `json:"mime_type,omitempty"`
	SampleRate int    `json:"sample_rate,omitempty"`

	// For image messages
	Width  int `json:"width,omitempty"`
	Height int `json:"height,omitempty"`

	// For Q&A matched messages
	FromQA          bool    `json:"from_qa,omitempty"`
	Similarity      float64 `json:"similarity,omitempty"`
	MatchedQuestion string  `json:"matched_question,omitempty"`

	// For any message
	FileName string `json:"file_name,omitempty"`
	FileSize int    `json:"file_size,omitempty"`
}

// SendTextMessageRequest represents a request to send a text message
type SendTextMessageRequest struct {
	UserID      int                  `json:"user_id"`
	ToUserID    int                  `json:"to_user_id"`
	TextContent string               `json:"text_content"`
	SessionID   *string              `json:"session_id,omitempty"`
	Metadata    *ChatMessageMetadata `json:"metadata,omitempty"`
}

// SendAudioMessageRequest represents a request to send an audio message
type SendAudioMessageRequest struct {
	UserID      int     `json:"user_id"`
	ToUserID    int     `json:"to_user_id"`
	AudioData   string  `json:"audio_data"`   // Base64 encoded audio
	Transcript  *string `json:"transcript,omitempty"` // Optional transcript
	DurationMs  int     `json:"duration_ms"`
	MimeType    string  `json:"mime_type"` // e.g., "audio/webm"
	SessionID   *string `json:"session_id,omitempty"`
}

// ChatMessageResponse is the API response for a chat message
type ChatMessageResponse struct {
	ID          int64                `json:"id"`
	UserID      int                  `json:"user_id"`
	ToUserID    int                  `json:"to_user_id"`
	MsgType     MessageType          `json:"msg_type"`
	TextContent *string              `json:"text_content,omitempty"`
	AudioURL    *string              `json:"audio_url,omitempty"` // URL to fetch audio
	Metadata    *ChatMessageMetadata `json:"metadata,omitempty"`
	SessionID   *string              `json:"session_id,omitempty"`
	CreatedAt   time.Time            `json:"created_at"`
	IsFromUser  bool                 `json:"is_from_user"` // true if from user, false if from system
}

// GetMessagesRequest represents a request to get chat messages
type GetMessagesRequest struct {
	UserID    int     `json:"user_id"`
	SessionID *string `json:"session_id,omitempty"`
	Limit     int     `json:"limit"`
	Offset    int     `json:"offset"`
	Before    *int64  `json:"before,omitempty"` // Get messages before this ID
}

// GetMessagesResponse represents the response for getting messages
type GetMessagesResponse struct {
	Messages []ChatMessageResponse `json:"messages"`
	Total    int                   `json:"total"`
	Limit    int                   `json:"limit"`
	Offset   int                   `json:"offset"`
}

// IsFromSystem returns true if the message is from the system
func (m *ChatMessage) IsFromSystem() bool {
	return m.UserID == SystemUserID
}

// IsFromUser returns true if the message is from a regular user
func (m *ChatMessage) IsFromUser() bool {
	return m.UserID != SystemUserID
}

// ToResponse converts ChatMessage to ChatMessageResponse
func (m *ChatMessage) ToResponse(audioBaseURL string) ChatMessageResponse {
	resp := ChatMessageResponse{
		ID:          m.ID,
		UserID:      m.UserID,
		ToUserID:    m.ToUserID,
		MsgType:     m.MsgType,
		TextContent: m.TextContent,
		SessionID:   m.SessionID,
		CreatedAt:   m.CreatedAt,
		IsFromUser:  m.IsFromUser(),
	}

	// Parse metadata
	if len(m.Metadata) > 0 {
		var meta ChatMessageMetadata
		if err := json.Unmarshal(m.Metadata, &meta); err == nil {
			resp.Metadata = &meta
		}
	}

	// Set audio URL for audio messages
	if m.MsgType == MessageTypeAudio && len(m.Content) > 0 {
		url := fmt.Sprintf("%s?id=%d", audioBaseURL, m.ID)
		resp.AudioURL = &url
	}

	return resp
}
