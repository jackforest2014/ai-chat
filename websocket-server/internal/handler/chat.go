package handler

import (
	"context"
	"encoding/json"
	"log"
	"net/http"
	"time"

	"github.com/your-org/websocket-server/internal/analyzer"
	"github.com/your-org/websocket-server/internal/hub"
	"github.com/your-org/websocket-server/internal/qamatcher"
	"github.com/your-org/websocket-server/internal/repository"
)

// ChatHandler handles chat-related requests
type ChatHandler struct {
	hub               *hub.Hub
	savedQuestionRepo repository.SavedQuestionRepository
	embedder          analyzer.EmbeddingGenerator
}

// NewChatHandler creates a new chat handler instance
func NewChatHandler(h *hub.Hub, savedQuestionRepo repository.SavedQuestionRepository, embedder analyzer.EmbeddingGenerator) *ChatHandler {
	return &ChatHandler{
		hub:               h,
		savedQuestionRepo: savedQuestionRepo,
		embedder:          embedder,
	}
}

// LoadQARequest represents the request to load Q&A pairs for a chat session
type LoadQARequest struct {
	ClientID string `json:"client_id"` // WebSocket client ID
	UserID   string `json:"user_id"`   // User ID who owns the questions
	JobID    string `json:"job_id"`    // Job ID to load questions from
	Limit    int    `json:"limit"`     // Number of Q&A pairs to load (default: 20)
}

// LoadQAResponse represents the response after loading Q&A pairs
type LoadQAResponse struct {
	Success   bool   `json:"success"`
	Count     int    `json:"count"`     // Number of Q&A pairs loaded
	Threshold float64 `json:"threshold"` // Similarity threshold
	Message   string `json:"message"`
}

// HandleLoadQA loads Q&A pairs into memory for a chat session
func (h *ChatHandler) HandleLoadQA(w http.ResponseWriter, r *http.Request) {
	// Only allow POST requests
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Parse request body
	var req LoadQARequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondJSON(w, http.StatusBadRequest, map[string]string{"error": "Invalid request body"})
		return
	}

	// Validate required fields
	if req.ClientID == "" {
		respondJSON(w, http.StatusBadRequest, map[string]string{"error": "Missing required field: client_id"})
		return
	}
	if req.UserID == "" {
		respondJSON(w, http.StatusBadRequest, map[string]string{"error": "Missing required field: user_id"})
		return
	}
	if req.JobID == "" {
		respondJSON(w, http.StatusBadRequest, map[string]string{"error": "Missing required field: job_id"})
		return
	}

	// Set default limit
	if req.Limit <= 0 {
		req.Limit = 20
	}
	if req.Limit > 100 {
		req.Limit = 100 // Cap at 100 for performance
	}

	ctx, cancel := context.WithTimeout(r.Context(), 30*time.Second)
	defer cancel()

	// Find the client
	client := h.hub.FindClientByID(req.ClientID)
	if client == nil {
		respondJSON(w, http.StatusNotFound, map[string]string{"error": "Client not found or not connected"})
		return
	}

	// Get saved questions for the specific user and job
	questions, err := h.savedQuestionRepo.GetSavedQuestionsByJob(ctx, req.UserID, req.JobID)
	if err != nil {
		log.Printf("Error loading saved questions for user %s, job %s: %v", req.UserID, req.JobID, err)
		respondJSON(w, http.StatusInternalServerError, map[string]string{"error": "Failed to load Q&A pairs"})
		return
	}

	// Limit the number of questions
	if len(questions) > req.Limit {
		questions = questions[:req.Limit]
	}

	if len(questions) == 0 {
		respondJSON(w, http.StatusOK, LoadQAResponse{
			Success: true,
			Count:   0,
			Message: "No saved Q&A pairs found for this job",
		})
		return
	}

	// Create a new embedding matcher
	// Similarity threshold: 0.75 means 75% similarity required for a match
	matcher := qamatcher.NewEmbeddingMatcher(h.embedder, 0.75)

	// Load questions into the matcher
	if err := matcher.LoadQuestions(questions); err != nil {
		log.Printf("Error loading questions into matcher: %v", err)
		respondJSON(w, http.StatusInternalServerError, map[string]string{"error": "Failed to initialize Q&A matcher"})
		return
	}

	// Set the matcher for this client
	client.SetQAMatcher(matcher)

	log.Printf("Loaded %d Q&A pairs for client %s (user: %s, job: %s, threshold: %.2f)",
		matcher.Count(), req.ClientID, req.UserID, req.JobID, matcher.GetThreshold())

	// Return success response
	respondJSON(w, http.StatusOK, LoadQAResponse{
		Success:   true,
		Count:     matcher.Count(),
		Threshold: matcher.GetThreshold(),
		Message:   "Q&A pairs loaded successfully",
	})
}

// HandleUnloadQA removes Q&A pairs from memory for a chat session
func (h *ChatHandler) HandleUnloadQA(w http.ResponseWriter, r *http.Request) {
	// Only allow POST requests
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Parse request body
	var req struct {
		ClientID string `json:"client_id"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondJSON(w, http.StatusBadRequest, map[string]string{"error": "Invalid request body"})
		return
	}

	if req.ClientID == "" {
		respondJSON(w, http.StatusBadRequest, map[string]string{"error": "Missing required field: client_id"})
		return
	}

	// Find the client
	client := h.hub.FindClientByID(req.ClientID)
	if client == nil {
		respondJSON(w, http.StatusNotFound, map[string]string{"error": "Client not found or not connected"})
		return
	}

	// Clear the matcher
	matcher := client.GetQAMatcher()
	if matcher != nil {
		matcher.Clear()
	}
	client.SetQAMatcher(nil)

	log.Printf("Unloaded Q&A pairs for client %s", req.ClientID)

	respondJSON(w, http.StatusOK, map[string]interface{}{
		"success": true,
		"message": "Q&A pairs unloaded successfully",
	})
}
