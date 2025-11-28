package handler

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/your-org/websocket-server/internal/repository"
	"github.com/your-org/websocket-server/pkg/models"
)

const (
	// MaxUploadSize defines the maximum file size allowed (10MB)
	MaxUploadSize = 10 * 1024 * 1024 // 10 MB

	// AllowedMimeTypes defines accepted resume file formats
	AllowedMimeTypes = "application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
)

// UploadHandler handles file upload HTTP requests
type UploadHandler struct {
	repo         repository.UploadRepository
	analysisRepo repository.AnalysisRepository
}

// NewUploadHandler creates a new upload handler instance
func NewUploadHandler(repo repository.UploadRepository, analysisRepo repository.AnalysisRepository) *UploadHandler {
	return &UploadHandler{repo: repo, analysisRepo: analysisRepo}
}

// HandleUpload processes multipart file upload requests
func (h *UploadHandler) HandleUpload(w http.ResponseWriter, r *http.Request) {
	// Only allow POST requests
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Limit request body size
	r.Body = http.MaxBytesReader(w, r.Body, MaxUploadSize)

	// Parse multipart form
	err := r.ParseMultipartForm(MaxUploadSize)
	if err != nil {
		log.Printf("Error parsing multipart form: %v", err)
		respondJSON(w, http.StatusBadRequest, map[string]string{"error": "File too large or invalid form data"})
		return
	}

	// Get user_id (optional but recommended for authenticated users)
	var userID *int
	if userIDStr := r.FormValue("user_id"); userIDStr != "" {
		if uid, err := strconv.Atoi(userIDStr); err == nil {
			userID = &uid
		}
	}

	// Get LinkedIn URL (optional)
	var linkedinURL *string
	if url := r.FormValue("linkedin_url"); url != "" {
		// Validate LinkedIn URL format
		if !strings.HasPrefix(url, "http://linkedin.com/") &&
			!strings.HasPrefix(url, "https://linkedin.com/") &&
			!strings.HasPrefix(url, "http://www.linkedin.com/") &&
			!strings.HasPrefix(url, "https://www.linkedin.com/") {
			respondJSON(w, http.StatusBadRequest, map[string]string{"error": "Invalid LinkedIn URL format"})
			return
		}
		linkedinURL = &url
	}

	// Get file from form
	file, fileHeader, err := r.FormFile("resume")
	if err != nil {
		log.Printf("Error retrieving file: %v", err)
		respondJSON(w, http.StatusBadRequest, map[string]string{"error": "Resume file is required"})
		return
	}
	defer file.Close()

	// Validate file size
	if fileHeader.Size > MaxUploadSize {
		respondJSON(w, http.StatusBadRequest, map[string]string{"error": "File size exceeds 10MB limit"})
		return
	}

	// Validate MIME type
	mimeType := fileHeader.Header.Get("Content-Type")
	if !isAllowedMimeType(mimeType) {
		respondJSON(w, http.StatusBadRequest, map[string]string{
			"error":           "Invalid file type. Only PDF and Word documents are allowed",
			"allowed_formats": "PDF (.pdf), Word (.doc, .docx)",
		})
		return
	}

	// Read file content
	fileContent, err := io.ReadAll(file)
	if err != nil {
		log.Printf("Error reading file content: %v", err)
		respondJSON(w, http.StatusInternalServerError, map[string]string{"error": "Failed to read file content"})
		return
	}

	// Create upload record
	upload := &models.Upload{
		UserID:      userID,
		LinkedinURL: linkedinURL,
		FileName:    fileHeader.Filename,
		FileContent: fileContent,
		FileSize:    int(fileHeader.Size),
		MimeType:    mimeType,
	}

	// Store in database
	ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
	defer cancel()

	err = h.repo.CreateUpload(ctx, upload)
	if err != nil {
		log.Printf("Error creating upload: %v", err)
		respondJSON(w, http.StatusInternalServerError, map[string]string{"error": "Failed to save upload"})
		return
	}

	// Respond with success
	response := models.UploadResponse{
		ID:          upload.ID,
		LinkedinURL: upload.LinkedinURL,
		FileName:    upload.FileName,
		FileSize:    upload.FileSize,
		MimeType:    upload.MimeType,
		CreatedAt:   upload.CreatedAt,
		Message:     "Resume uploaded successfully",
	}

	respondJSON(w, http.StatusCreated, response)
}

// HandleGetUpload retrieves upload metadata by ID
func (h *UploadHandler) HandleGetUpload(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Get ID from query parameter
	idStr := r.URL.Query().Get("id")
	if idStr == "" {
		respondJSON(w, http.StatusBadRequest, map[string]string{"error": "Upload ID is required"})
		return
	}

	id, err := strconv.Atoi(idStr)
	if err != nil {
		respondJSON(w, http.StatusBadRequest, map[string]string{"error": "Invalid upload ID"})
		return
	}

	ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
	defer cancel()

	upload, err := h.repo.GetUploadByID(ctx, id)
	if err != nil {
		log.Printf("Error getting upload: %v", err)
		respondJSON(w, http.StatusNotFound, map[string]string{"error": "Upload not found"})
		return
	}

	respondJSON(w, http.StatusOK, upload)
}

// HandleListUploads retrieves all uploads with pagination
// Optionally filters by user_id if provided
func (h *UploadHandler) HandleListUploads(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Get pagination parameters
	limitStr := r.URL.Query().Get("limit")
	offsetStr := r.URL.Query().Get("offset")
	userIDStr := r.URL.Query().Get("user_id")

	limit := 10 // default
	offset := 0 // default

	if limitStr != "" {
		if l, err := strconv.Atoi(limitStr); err == nil && l > 0 {
			limit = l
		}
	}

	if offsetStr != "" {
		if o, err := strconv.Atoi(offsetStr); err == nil && o >= 0 {
			offset = o
		}
	}

	ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
	defer cancel()

	var uploads []*models.Upload
	var err error

	// If user_id is provided, filter by user
	if userIDStr != "" {
		userID, parseErr := strconv.Atoi(userIDStr)
		if parseErr != nil {
			respondJSON(w, http.StatusBadRequest, map[string]string{"error": "Invalid user_id"})
			return
		}
		uploads, err = h.repo.ListUploadsByUserID(ctx, userID, limit, offset)
	} else {
		uploads, err = h.repo.ListUploads(ctx, limit, offset)
	}

	if err != nil {
		log.Printf("Error listing uploads: %v", err)
		respondJSON(w, http.StatusInternalServerError, map[string]string{"error": "Failed to retrieve uploads"})
		return
	}

	respondJSON(w, http.StatusOK, map[string]interface{}{
		"uploads": uploads,
		"count":   len(uploads),
		"limit":   limit,
		"offset":  offset,
	})
}

// HandleDownloadFile serves the uploaded file for download
func (h *UploadHandler) HandleDownloadFile(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Get ID from query parameter
	idStr := r.URL.Query().Get("id")
	if idStr == "" {
		http.Error(w, "Upload ID is required", http.StatusBadRequest)
		return
	}

	id, err := strconv.Atoi(idStr)
	if err != nil {
		http.Error(w, "Invalid upload ID", http.StatusBadRequest)
		return
	}

	ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
	defer cancel()

	// Get upload metadata first
	upload, err := h.repo.GetUploadByID(ctx, id)
	if err != nil {
		log.Printf("Error getting upload: %v", err)
		http.Error(w, "Upload not found", http.StatusNotFound)
		return
	}

	// Get file content
	fileContent, err := h.repo.GetUploadFileContent(ctx, id)
	if err != nil {
		log.Printf("Error getting file content: %v", err)
		http.Error(w, "Failed to retrieve file", http.StatusInternalServerError)
		return
	}

	// Set response headers
	w.Header().Set("Content-Type", upload.MimeType)
	w.Header().Set("Content-Disposition", fmt.Sprintf("attachment; filename=\"%s\"", upload.FileName))
	w.Header().Set("Content-Length", strconv.Itoa(len(fileContent)))

	// Write file content
	w.Write(fileContent)
}

// isAllowedMimeType checks if the MIME type is in the allowed list
func isAllowedMimeType(mimeType string) bool {
	allowed := strings.Split(AllowedMimeTypes, ",")
	for _, a := range allowed {
		if strings.TrimSpace(a) == mimeType {
			return true
		}
	}
	return false
}

// HandleAnalyzeResume handles resume analysis requests (placeholder)
func (h *UploadHandler) HandleAnalyzeResume(w http.ResponseWriter, r *http.Request) {
	// Only allow POST requests
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Get ID from query parameter
	idStr := r.URL.Query().Get("id")
	if idStr == "" {
		respondJSON(w, http.StatusBadRequest, map[string]string{"error": "Upload ID is required"})
		return
	}

	id, err := strconv.Atoi(idStr)
	if err != nil {
		respondJSON(w, http.StatusBadRequest, map[string]string{"error": "Invalid upload ID"})
		return
	}

	ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
	defer cancel()

	// Verify the upload exists and get metadata
	upload, err := h.repo.GetUploadByID(ctx, id)
	if err != nil {
		log.Printf("Error getting upload for analysis: %v", err)
		respondJSON(w, http.StatusNotFound, map[string]string{"error": "Upload not found"})
		return
	}

	// TODO: Implement actual resume analysis logic here
	// This is a placeholder that will be replaced with:
	// - AI-powered resume parsing
	// - Skills extraction
	// - Experience analysis
	// - Job matching recommendations
	// - etc.

	log.Printf("Analysis requested for upload ID: %d (file: %s, size: %d bytes)",
		id, upload.FileName, upload.FileSize)

	// Simulate analysis by generating a job ID
	jobID := fmt.Sprintf("job_%d_%d", id, time.Now().Unix())

	// Return placeholder response
	respondJSON(w, http.StatusAccepted, map[string]interface{}{
		"status":    "analysis_started",
		"job_id":    jobID,
		"upload_id": id,
		"message":   "Resume analysis has been queued. This is a placeholder endpoint.",
		"metadata": map[string]interface{}{
			"file_name":    upload.FileName,
			"file_size":    upload.FileSize,
			"mime_type":    upload.MimeType,
			"linkedin_url": upload.LinkedinURL,
		},
		"note": "Actual analysis implementation will be added here in the future",
	})

	log.Printf("Analysis job created: %s for upload ID: %d", jobID, id)
}

// HandleDeleteUpload deletes an upload and all related data
func (h *UploadHandler) HandleDeleteUpload(w http.ResponseWriter, r *http.Request) {
	// Only allow DELETE requests
	if r.Method != http.MethodDelete {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Get ID from query parameter
	idStr := r.URL.Query().Get("id")
	if idStr == "" {
		respondJSON(w, http.StatusBadRequest, map[string]string{"error": "Upload ID is required"})
		return
	}

	id, err := strconv.Atoi(idStr)
	if err != nil {
		respondJSON(w, http.StatusBadRequest, map[string]string{"error": "Invalid upload ID"})
		return
	}

	ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
	defer cancel()

	// Verify the upload exists
	_, err = h.repo.GetUploadByID(ctx, id)
	if err != nil {
		log.Printf("Error getting upload for deletion: %v", err)
		respondJSON(w, http.StatusNotFound, map[string]string{"error": "Upload not found"})
		return
	}

	// Delete related data in order:
	// 1. Delete user profiles (depends on analysis jobs)
	if h.analysisRepo != nil {
		if err := h.analysisRepo.DeleteProfilesByUploadID(ctx, id); err != nil {
			log.Printf("Warning: failed to delete profiles for upload %d: %v", id, err)
			// Continue anyway - profiles might not exist
		}

		// 2. Delete analysis jobs
		if err := h.analysisRepo.DeleteJobsByUploadID(ctx, id); err != nil {
			log.Printf("Warning: failed to delete jobs for upload %d: %v", id, err)
			// Continue anyway - jobs might not exist
		}
	}

	// 3. Delete the upload itself
	if err := h.repo.DeleteUpload(ctx, id); err != nil {
		log.Printf("Error deleting upload: %v", err)
		respondJSON(w, http.StatusInternalServerError, map[string]string{"error": "Failed to delete upload"})
		return
	}

	log.Printf("Successfully deleted upload %d and all related data", id)
	respondJSON(w, http.StatusOK, map[string]string{
		"message": "Upload and all related data deleted successfully",
	})
}

// respondJSON sends a JSON response
func respondJSON(w http.ResponseWriter, statusCode int, data interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(statusCode)
	if err := json.NewEncoder(w).Encode(data); err != nil {
		log.Printf("Error encoding JSON response: %v", err)
	}
}
