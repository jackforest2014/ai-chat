package handler

import (
	"context"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"strconv"
	"time"

	"github.com/your-org/websocket-server/internal/repository"
	"github.com/your-org/websocket-server/pkg/models"
)

// ChatMessageHandler handles chat message HTTP requests
type ChatMessageHandler struct {
	repo repository.ChatMessageRepository
}

// NewChatMessageHandler creates a new chat message handler
func NewChatMessageHandler(repo repository.ChatMessageRepository) *ChatMessageHandler {
	return &ChatMessageHandler{repo: repo}
}

// HandleSendTextMessage handles POST /api/chat/message/text
func (h *ChatMessageHandler) HandleSendTextMessage(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req models.SendTextMessageRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondJSON(w, http.StatusBadRequest, map[string]string{"error": "Invalid request body"})
		return
	}

	if req.TextContent == "" {
		respondJSON(w, http.StatusBadRequest, map[string]string{"error": "Text content is required"})
		return
	}

	// Create message
	msg := &models.ChatMessage{
		UserID:      req.UserID,
		ToUserID:    req.ToUserID,
		MsgType:     models.MessageTypeText,
		TextContent: &req.TextContent,
		SessionID:   req.SessionID,
	}

	// Add metadata if provided
	if req.Metadata != nil {
		metaBytes, _ := json.Marshal(req.Metadata)
		msg.Metadata = metaBytes
	}

	ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
	defer cancel()

	if err := h.repo.CreateMessage(ctx, msg); err != nil {
		log.Printf("Error creating text message: %v", err)
		respondJSON(w, http.StatusInternalServerError, map[string]string{"error": "Failed to save message"})
		return
	}

	respondJSON(w, http.StatusCreated, msg.ToResponse("/api/chat/message/audio"))
}

// HandleSendAudioMessage handles POST /api/chat/message/audio
func (h *ChatMessageHandler) HandleSendAudioMessage(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req models.SendAudioMessageRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondJSON(w, http.StatusBadRequest, map[string]string{"error": "Invalid request body"})
		return
	}

	if req.AudioData == "" {
		respondJSON(w, http.StatusBadRequest, map[string]string{"error": "Audio data is required"})
		return
	}

	// Decode base64 audio data
	audioBytes, err := base64.StdEncoding.DecodeString(req.AudioData)
	if err != nil {
		respondJSON(w, http.StatusBadRequest, map[string]string{"error": "Invalid audio data encoding"})
		return
	}

	// Create metadata
	metadata := models.ChatMessageMetadata{
		DurationMs: req.DurationMs,
		MimeType:   req.MimeType,
	}
	metaBytes, _ := json.Marshal(metadata)

	// Create message
	msg := &models.ChatMessage{
		UserID:      req.UserID,
		ToUserID:    req.ToUserID,
		MsgType:     models.MessageTypeAudio,
		TextContent: req.Transcript,
		Content:     audioBytes,
		Metadata:    metaBytes,
		SessionID:   req.SessionID,
	}

	ctx, cancel := context.WithTimeout(r.Context(), 30*time.Second)
	defer cancel()

	if err := h.repo.CreateMessage(ctx, msg); err != nil {
		log.Printf("Error creating audio message: %v", err)
		respondJSON(w, http.StatusInternalServerError, map[string]string{"error": "Failed to save message"})
		return
	}

	log.Printf("Audio message saved: id=%d, user=%d, duration=%dms, size=%d bytes",
		msg.ID, msg.UserID, req.DurationMs, len(audioBytes))

	respondJSON(w, http.StatusCreated, msg.ToResponse("/api/chat/message/audio"))
}

// HandleGetAudioContent handles GET /api/chat/message/audio?id=X
func (h *ChatMessageHandler) HandleGetAudioContent(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	idStr := r.URL.Query().Get("id")
	if idStr == "" {
		http.Error(w, "Message ID is required", http.StatusBadRequest)
		return
	}

	id, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil {
		http.Error(w, "Invalid message ID", http.StatusBadRequest)
		return
	}

	ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
	defer cancel()

	// Get message to check type and get metadata
	msg, err := h.repo.GetMessageByID(ctx, id)
	if err != nil {
		log.Printf("Error getting message: %v", err)
		http.Error(w, "Message not found", http.StatusNotFound)
		return
	}

	if msg.MsgType != models.MessageTypeAudio {
		http.Error(w, "Message is not an audio message", http.StatusBadRequest)
		return
	}

	// Get content
	content, err := h.repo.GetMessageContent(ctx, id)
	if err != nil {
		log.Printf("Error getting message content: %v", err)
		http.Error(w, "Failed to get audio content", http.StatusInternalServerError)
		return
	}

	// Parse metadata for mime type
	mimeType := "audio/webm"
	if len(msg.Metadata) > 0 {
		var meta models.ChatMessageMetadata
		if json.Unmarshal(msg.Metadata, &meta) == nil && meta.MimeType != "" {
			mimeType = meta.MimeType
		}
	}

	// Set headers and return audio
	w.Header().Set("Content-Type", mimeType)
	w.Header().Set("Content-Length", strconv.Itoa(len(content)))
	w.Header().Set("Cache-Control", "private, max-age=3600")
	w.Write(content)
}

// HandleGetMessages handles GET /api/chat/messages
func (h *ChatMessageHandler) HandleGetMessages(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	userIDStr := r.URL.Query().Get("user_id")
	if userIDStr == "" {
		respondJSON(w, http.StatusBadRequest, map[string]string{"error": "user_id is required"})
		return
	}

	userID, err := strconv.Atoi(userIDStr)
	if err != nil {
		respondJSON(w, http.StatusBadRequest, map[string]string{"error": "Invalid user_id"})
		return
	}

	// Parse pagination
	limit := 50
	offset := 0
	if l := r.URL.Query().Get("limit"); l != "" {
		if parsed, err := strconv.Atoi(l); err == nil && parsed > 0 && parsed <= 100 {
			limit = parsed
		}
	}
	if o := r.URL.Query().Get("offset"); o != "" {
		if parsed, err := strconv.Atoi(o); err == nil && parsed >= 0 {
			offset = parsed
		}
	}

	ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
	defer cancel()

	// Check for session filter
	sessionID := r.URL.Query().Get("session_id")

	var messages []*models.ChatMessage
	if sessionID != "" {
		messages, err = h.repo.GetMessagesBySession(ctx, sessionID, limit, offset)
	} else {
		messages, err = h.repo.GetConversation(ctx, userID, models.SystemUserID, limit, offset)
	}

	if err != nil {
		log.Printf("Error getting messages: %v", err)
		respondJSON(w, http.StatusInternalServerError, map[string]string{"error": "Failed to get messages"})
		return
	}

	// Convert to responses
	audioBaseURL := fmt.Sprintf("http://%s/api/chat/message/audio", r.Host)
	responses := make([]models.ChatMessageResponse, len(messages))
	for i, msg := range messages {
		responses[i] = msg.ToResponse(audioBaseURL)
	}

	respondJSON(w, http.StatusOK, models.GetMessagesResponse{
		Messages: responses,
		Total:    len(responses),
		Limit:    limit,
		Offset:   offset,
	})
}

// HandleSendSystemMessage creates a system message (for Q&A matches, etc.)
func (h *ChatMessageHandler) HandleSendSystemMessage(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req struct {
		ToUserID    int                        `json:"to_user_id"`
		TextContent string                     `json:"text_content"`
		Metadata    *models.ChatMessageMetadata `json:"metadata,omitempty"`
		SessionID   *string                    `json:"session_id,omitempty"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondJSON(w, http.StatusBadRequest, map[string]string{"error": "Invalid request body"})
		return
	}

	// Create system message
	msg := &models.ChatMessage{
		UserID:      models.SystemUserID,
		ToUserID:    req.ToUserID,
		MsgType:     models.MessageTypeText,
		TextContent: &req.TextContent,
		SessionID:   req.SessionID,
	}

	if req.Metadata != nil {
		metaBytes, _ := json.Marshal(req.Metadata)
		msg.Metadata = metaBytes
	}

	ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
	defer cancel()

	if err := h.repo.CreateMessage(ctx, msg); err != nil {
		log.Printf("Error creating system message: %v", err)
		respondJSON(w, http.StatusInternalServerError, map[string]string{"error": "Failed to save message"})
		return
	}

	respondJSON(w, http.StatusCreated, msg.ToResponse("/api/chat/message/audio"))
}
