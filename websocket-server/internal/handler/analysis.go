package handler

import (
	"context"
	"log"
	"net/http"
	"strconv"
	"time"

	"github.com/your-org/websocket-server/internal/analyzer"
)

// AnalysisHandler handles resume analysis HTTP requests
type AnalysisHandler struct {
	analyzer analyzer.ResumeAnalyzer
}

// NewAnalysisHandler creates a new analysis handler instance
func NewAnalysisHandler(analyzer analyzer.ResumeAnalyzer) *AnalysisHandler {
	return &AnalysisHandler{analyzer: analyzer}
}

// HandleAnalyzeResume starts asynchronous resume analysis
func (h *AnalysisHandler) HandleAnalyzeResume(w http.ResponseWriter, r *http.Request) {
	// Only allow POST requests
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Get upload ID from query parameter
	idStr := r.URL.Query().Get("id")
	if idStr == "" {
		respondJSON(w, http.StatusBadRequest, map[string]string{"error": "Upload ID is required"})
		return
	}

	uploadID, err := strconv.Atoi(idStr)
	if err != nil {
		respondJSON(w, http.StatusBadRequest, map[string]string{"error": "Invalid upload ID"})
		return
	}

	// Get optional user ID from query parameter
	var userID *int
	if userIDStr := r.URL.Query().Get("user_id"); userIDStr != "" {
		if uid, err := strconv.Atoi(userIDStr); err == nil {
			userID = &uid
		}
	}

	// Start async analysis
	ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
	defer cancel()

	jobID, err := h.analyzer.AnalyzeAsync(ctx, uploadID, userID)
	if err != nil {
		log.Printf("Error starting analysis: %v", err)
		respondJSON(w, http.StatusInternalServerError, map[string]string{"error": "Failed to start analysis"})
		return
	}

	// Return job ID for status tracking
	respondJSON(w, http.StatusAccepted, map[string]interface{}{
		"status":    "analysis_started",
		"job_id":    jobID,
		"upload_id": uploadID,
		"message":   "Resume analysis has been started. Use /api/analysis/status to track progress.",
	})

	log.Printf("Analysis job %s started for upload ID: %d", jobID, uploadID)
}

// HandleAnalysisStatus returns the current status of an analysis job
func (h *AnalysisHandler) HandleAnalysisStatus(w http.ResponseWriter, r *http.Request) {
	// Only allow GET requests
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Get job ID from query parameter
	jobID := r.URL.Query().Get("job_id")
	if jobID == "" {
		respondJSON(w, http.StatusBadRequest, map[string]string{"error": "Job ID is required"})
		return
	}

	ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
	defer cancel()

	// Get status
	status, err := h.analyzer.GetStatus(ctx, jobID)
	if err != nil {
		log.Printf("Error getting analysis status: %v", err)
		respondJSON(w, http.StatusNotFound, map[string]string{"error": "Job not found"})
		return
	}

	respondJSON(w, http.StatusOK, status)
}

// HandleAnalysisResult returns the complete analysis result for a completed job
func (h *AnalysisHandler) HandleAnalysisResult(w http.ResponseWriter, r *http.Request) {
	// Only allow GET requests
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Get job ID from query parameter
	jobID := r.URL.Query().Get("job_id")
	if jobID == "" {
		respondJSON(w, http.StatusBadRequest, map[string]string{"error": "Job ID is required"})
		return
	}

	ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
	defer cancel()

	// Get result
	result, err := h.analyzer.GetResult(ctx, jobID)
	if err != nil {
		log.Printf("Error getting analysis result: %v", err)
		if err.Error() == "job is not completed yet" {
			respondJSON(w, http.StatusAccepted, map[string]string{
				"error":   "Analysis not yet completed",
				"message": "Please check /api/analysis/status for current progress",
			})
			return
		}
		respondJSON(w, http.StatusNotFound, map[string]string{"error": "Result not found"})
		return
	}

	respondJSON(w, http.StatusOK, result)
}

// HandleSearchResumes searches for similar resumes using vector similarity
func (h *AnalysisHandler) HandleSearchResumes(w http.ResponseWriter, r *http.Request) {
	// Only allow GET requests
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Get query from parameter
	query := r.URL.Query().Get("query")
	if query == "" {
		respondJSON(w, http.StatusBadRequest, map[string]string{"error": "Query parameter is required"})
		return
	}

	// Get limit (default 10)
	limit := 10
	if limitStr := r.URL.Query().Get("limit"); limitStr != "" {
		if l, err := strconv.Atoi(limitStr); err == nil && l > 0 && l <= 50 {
			limit = l
		}
	}

	ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
	defer cancel()

	// Search
	profiles, err := h.analyzer.SearchSimilarResumes(ctx, query, limit)
	if err != nil {
		log.Printf("Error searching resumes: %v", err)
		respondJSON(w, http.StatusInternalServerError, map[string]string{"error": "Search failed"})
		return
	}

	respondJSON(w, http.StatusOK, map[string]interface{}{
		"query":   query,
		"count":   len(profiles),
		"results": profiles,
	})
}

// HandleGetUserJobs returns all analysis jobs for a specific user
func (h *AnalysisHandler) HandleGetUserJobs(w http.ResponseWriter, r *http.Request) {
	// Only allow GET requests
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Get user ID from query parameter
	userIDStr := r.URL.Query().Get("user_id")
	if userIDStr == "" {
		respondJSON(w, http.StatusBadRequest, map[string]string{"error": "User ID is required"})
		return
	}

	userID, err := strconv.Atoi(userIDStr)
	if err != nil {
		respondJSON(w, http.StatusBadRequest, map[string]string{"error": "Invalid user ID"})
		return
	}

	ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
	defer cancel()

	// Get jobs for user
	jobs, err := h.analyzer.GetJobsByUserID(ctx, userID)
	if err != nil {
		log.Printf("Error getting user jobs: %v", err)
		respondJSON(w, http.StatusInternalServerError, map[string]string{"error": "Failed to get jobs"})
		return
	}

	respondJSON(w, http.StatusOK, map[string]interface{}{
		"user_id": userID,
		"count":   len(jobs),
		"jobs":    jobs,
	})
}

// HandleGetUploadJobs returns all analysis jobs for a specific upload
func (h *AnalysisHandler) HandleGetUploadJobs(w http.ResponseWriter, r *http.Request) {
	// Only allow GET requests
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Get upload ID from query parameter
	uploadIDStr := r.URL.Query().Get("upload_id")
	if uploadIDStr == "" {
		respondJSON(w, http.StatusBadRequest, map[string]string{"error": "Upload ID is required"})
		return
	}

	uploadID, err := strconv.Atoi(uploadIDStr)
	if err != nil {
		respondJSON(w, http.StatusBadRequest, map[string]string{"error": "Invalid upload ID"})
		return
	}

	ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
	defer cancel()

	// Get jobs for upload
	jobs, err := h.analyzer.GetJobsByUploadID(ctx, uploadID)
	if err != nil {
		log.Printf("Error getting upload jobs: %v", err)
		respondJSON(w, http.StatusInternalServerError, map[string]string{"error": "Failed to get jobs"})
		return
	}

	respondJSON(w, http.StatusOK, map[string]interface{}{
		"upload_id": uploadID,
		"count":     len(jobs),
		"jobs":      jobs,
	})
}

// HandleDeleteJob deletes a single analysis job and its associated profile
func (h *AnalysisHandler) HandleDeleteJob(w http.ResponseWriter, r *http.Request) {
	// Only allow DELETE requests
	if r.Method != http.MethodDelete {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Get job ID from query parameter
	jobID := r.URL.Query().Get("job_id")
	if jobID == "" {
		respondJSON(w, http.StatusBadRequest, map[string]string{"error": "Job ID is required"})
		return
	}

	ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
	defer cancel()

	// First check if the job exists and get its status
	status, err := h.analyzer.GetStatus(ctx, jobID)
	if err != nil {
		log.Printf("Error getting job status for deletion: %v", err)
		respondJSON(w, http.StatusNotFound, map[string]string{"error": "Job not found"})
		return
	}

	// Only allow deletion of completed or failed jobs
	if status.Status != "completed" && status.Status != "failed" {
		respondJSON(w, http.StatusBadRequest, map[string]string{
			"error":   "Cannot delete job in progress",
			"status":  status.Status,
			"message": "Only completed or failed jobs can be deleted",
		})
		return
	}

	// Delete the job
	err = h.analyzer.DeleteJob(ctx, jobID)
	if err != nil {
		log.Printf("Error deleting job %s: %v", jobID, err)
		respondJSON(w, http.StatusInternalServerError, map[string]string{"error": "Failed to delete job"})
		return
	}

	log.Printf("Deleted analysis job: %s", jobID)

	respondJSON(w, http.StatusOK, map[string]interface{}{
		"success": true,
		"message": "Job deleted successfully",
		"job_id":  jobID,
	})
}
