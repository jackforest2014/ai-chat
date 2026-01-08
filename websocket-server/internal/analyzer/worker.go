package analyzer

import (
	"context"
	"fmt"
	"log"
	"time"

	"github.com/google/uuid"
	"github.com/your-org/websocket-server/internal/repository"
	"github.com/your-org/websocket-server/pkg/models"
)

// DefaultResumeAnalyzer implements the ResumeAnalyzer interface
type DefaultResumeAnalyzer struct {
	uploadRepo    repository.UploadRepository
	analysisRepo  repository.AnalysisRepository
	extractor     TextExtractor
	chunker       TextChunker
	embedder      EmbeddingGenerator
	vectorStore   VectorStore
	llmClient     LLMClient
	workerPool    chan struct{} // Semaphore for limiting concurrent jobs
}

// Config holds configuration for the analyzer
type Config struct {
	ChunkSize       int
	ChunkOverlap    int
	MaxConcurrentJobs int
}

// NewResumeAnalyzer creates a new resume analyzer instance
func NewResumeAnalyzer(
	uploadRepo repository.UploadRepository,
	analysisRepo repository.AnalysisRepository,
	extractor TextExtractor,
	chunker TextChunker,
	embedder EmbeddingGenerator,
	vectorStore VectorStore,
	llmClient LLMClient,
	config *Config,
) ResumeAnalyzer {
	if config == nil {
		config = &Config{
			ChunkSize:       1000,
			ChunkOverlap:    200,
			MaxConcurrentJobs: 5,
		}
	}

	return &DefaultResumeAnalyzer{
		uploadRepo:   uploadRepo,
		analysisRepo: analysisRepo,
		extractor:    extractor,
		chunker:      chunker,
		embedder:     embedder,
		vectorStore:  vectorStore,
		llmClient:    llmClient,
		workerPool:   make(chan struct{}, config.MaxConcurrentJobs),
	}
}

// AnalyzeAsync starts an asynchronous analysis job for a resume
func (a *DefaultResumeAnalyzer) AnalyzeAsync(ctx context.Context, uploadID int, userID *int) (string, error) {
	// Verify the upload exists
	upload, err := a.uploadRepo.GetUploadByID(ctx, uploadID)
	if err != nil {
		return "", fmt.Errorf("upload not found: %w", err)
	}

	// Generate unique job ID
	jobID := fmt.Sprintf("job_%s", uuid.New().String())

	// Create analysis job record
	job := &models.AnalysisJob{
		JobID:       jobID,
		UploadID:    uploadID,
		UserID:      userID,
		Status:      "queued",
		Progress:    0,
		CurrentStep: "Job queued for processing",
	}

	err = a.analysisRepo.CreateJob(ctx, job)
	if err != nil {
		return "", fmt.Errorf("failed to create job: %w", err)
	}

	// Start async worker
	go a.processJob(jobID, upload)

	return jobID, nil
}

// GetJobsByUserID retrieves all analysis jobs for a specific user
func (a *DefaultResumeAnalyzer) GetJobsByUserID(ctx context.Context, userID int) ([]*models.AnalysisJob, error) {
	return a.analysisRepo.GetJobsByUserID(ctx, userID)
}

// GetJobsByUploadID retrieves all analysis jobs for a specific upload
func (a *DefaultResumeAnalyzer) GetJobsByUploadID(ctx context.Context, uploadID int) ([]*models.AnalysisJob, error) {
	return a.analysisRepo.GetJobsByUploadID(ctx, uploadID)
}

// DeleteJob deletes a single analysis job and its associated profile
func (a *DefaultResumeAnalyzer) DeleteJob(ctx context.Context, jobID string) error {
	return a.analysisRepo.DeleteJob(ctx, jobID)
}

// RetryJob resets a failed job and reprocesses it
func (a *DefaultResumeAnalyzer) RetryJob(ctx context.Context, jobID string) error {
	// Get the job to validate it exists and check status
	job, err := a.analysisRepo.GetJobByID(ctx, jobID)
	if err != nil {
		return fmt.Errorf("job not found: %w", err)
	}

	// Only allow retry of failed jobs
	if job.Status != "failed" {
		return fmt.Errorf("only failed jobs can be retried, current status: %s", job.Status)
	}

	// Get the upload information
	upload, err := a.uploadRepo.GetUploadByID(ctx, job.UploadID)
	if err != nil {
		return fmt.Errorf("upload not found: %w", err)
	}

	// Reset the job to queued status
	if err := a.analysisRepo.ResetJobForRetry(ctx, jobID); err != nil {
		return fmt.Errorf("failed to reset job: %w", err)
	}

	log.Printf("Retrying analysis job %s for upload %d", jobID, upload.ID)

	// Start async worker with existing processJob method
	go a.processJob(jobID, upload)

	return nil
}

// BatchDeleteJobs deletes multiple analysis jobs and their associated profiles
func (a *DefaultResumeAnalyzer) BatchDeleteJobs(ctx context.Context, jobIDs []string) (*BatchDeleteResult, error) {
	if len(jobIDs) == 0 {
		return &BatchDeleteResult{
			Success:      true,
			DeletedCount: 0,
			DeletedJobs:  []string{},
			Message:      "No jobs to delete",
		}, nil
	}

	// Call repository method to delete jobs
	deletedJobs, err := a.analysisRepo.BatchDeleteJobs(ctx, jobIDs)
	if err != nil {
		return nil, fmt.Errorf("batch deletion failed: %w", err)
	}

	return &BatchDeleteResult{
		Success:      true,
		DeletedCount: len(deletedJobs),
		DeletedJobs:  deletedJobs,
		Message:      fmt.Sprintf("Successfully deleted %d job(s)", len(deletedJobs)),
	}, nil
}

// processJob processes a resume analysis job asynchronously
func (a *DefaultResumeAnalyzer) processJob(jobID string, upload *models.Upload) {
	// Acquire semaphore slot
	a.workerPool <- struct{}{}
	defer func() { <-a.workerPool }()

	// Use a context with overall timeout for the entire job (10 minutes)
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Minute)
	defer cancel()

	startTime := time.Now()

	log.Printf("Starting analysis job %s for upload %d", jobID, upload.ID)

	// Fetch file content from database
	fileContent, err := a.uploadRepo.GetUploadFileContent(ctx, upload.ID)
	if err != nil {
		a.handleError(ctx, jobID, fmt.Sprintf("Failed to fetch file content: %v", err))
		return
	}

	log.Printf("Fetched file content: %d bytes", len(fileContent))

	// Step 1: Extract text (0-20%)
	if err := a.updateProgress(ctx, jobID, "extracting_text", 10, "Extracting text from resume"); err != nil {
		log.Printf("Failed to update progress: %v", err)
	}

	// Create a timeout context specifically for text extraction (2 minutes max)
	extractCtx, extractCancel := context.WithTimeout(ctx, 2*time.Minute)
	defer extractCancel()

	resumeText, err := a.extractor.ExtractText(extractCtx, fileContent, upload.MimeType)
	if err != nil {
		a.handleError(ctx, jobID, fmt.Sprintf("Text extraction failed: %v", err))
		return
	}

	resumeText = CleanText(resumeText)
	log.Printf("Extracted %d characters from upload %d", len(resumeText), upload.ID)

	// Save extracted text to database
	if err := a.analysisRepo.UpdateExtractedText(ctx, jobID, resumeText); err != nil {
		log.Printf("Failed to save extracted text: %v", err)
	}

	// Step 2: Chunk text (20-40%)
	if err := a.updateProgress(ctx, jobID, "chunking", 25, "Chunking document into segments"); err != nil {
		log.Printf("Failed to update progress: %v", err)
	}

	chunks, err := a.chunker.ChunkText(resumeText, 1000, 200)
	if err != nil {
		a.handleError(ctx, jobID, fmt.Sprintf("Text chunking failed: %v", err))
		return
	}

	log.Printf("Created %d chunks for upload %d", len(chunks), upload.ID)

	// Step 3: Generate embeddings (40-60%)
	if err := a.updateProgress(ctx, jobID, "generating_embeddings", 45, "Generating vector embeddings"); err != nil {
		log.Printf("Failed to update progress: %v", err)
	}

	// Create a timeout context for embedding generation (3 minutes max for API calls)
	embedCtx, embedCancel := context.WithTimeout(ctx, 3*time.Minute)
	defer embedCancel()

	embeddings, err := a.embedder.GenerateEmbeddings(embedCtx, chunks)
	if err != nil {
		a.handleError(ctx, jobID, fmt.Sprintf("Embedding generation failed: %v", err))
		return
	}

	log.Printf("Generated %d embeddings for upload %d", len(embeddings), upload.ID)

	// Store embeddings in vector database
	if err := a.updateProgress(ctx, jobID, "generating_embeddings", 55, "Storing embeddings in vector database"); err != nil {
		log.Printf("Failed to update progress: %v", err)
	}

	if err := a.vectorStore.StoreEmbeddings(ctx, upload.ID, chunks, embeddings); err != nil {
		a.handleError(ctx, jobID, fmt.Sprintf("Vector storage failed: %v", err))
		return
	}

	// Step 4: RAG Analysis with LLM (60-95%)
	if err := a.updateProgress(ctx, jobID, "analyzing", 70, "Analyzing resume with AI"); err != nil {
		log.Printf("Failed to update progress: %v", err)
	}

	// Retrieve relevant chunks using vector search
	searchResults, err := a.vectorStore.SearchSimilar(ctx, "skills experience education", 10)
	if err != nil {
		log.Printf("Warning: vector search failed: %v", err)
		searchResults = []SearchResult{} // Continue without retrieved chunks
	}

	retrievedChunks := make([]string, len(searchResults))
	for i, result := range searchResults {
		retrievedChunks[i] = result.Chunk
	}

	// Call LLM for analysis
	analysisRequest := &AnalysisRequest{
		ResumeText:      resumeText,
		RetrievedChunks: retrievedChunks,
		LinkedInURL:     upload.LinkedinURL,
	}

	if err := a.updateProgress(ctx, jobID, "analyzing", 85, "Processing analysis results"); err != nil {
		log.Printf("Failed to update progress: %v", err)
	}

	// Create a timeout context for LLM analysis (3 minutes max)
	llmCtx, llmCancel := context.WithTimeout(ctx, 3*time.Minute)
	defer llmCancel()

	analysisResponse, err := a.llmClient.Analyze(llmCtx, analysisRequest)
	if err != nil {
		a.handleError(ctx, jobID, fmt.Sprintf("LLM analysis failed: %v", err))
		return
	}

	// Step 5: Store results (95-100%)
	if err := a.updateProgress(ctx, jobID, "analyzing", 95, "Saving analysis results"); err != nil {
		log.Printf("Failed to update progress: %v", err)
	}

	profile := &models.UserProfile{
		UploadID:           upload.ID,
		JobID:              jobID,
		Name:               analysisResponse.Name,
		Email:              analysisResponse.Email,
		Phone:              analysisResponse.Phone,
		LinkedInURL:        analysisResponse.LinkedInURL,
		Age:                analysisResponse.Age,
		Race:               analysisResponse.Race,
		Location:           analysisResponse.Location,
		TotalWorkYears:     analysisResponse.TotalWorkYears,
		Skills:             analysisResponse.Skills,
		Experience:         analysisResponse.Experience,
		Education:          analysisResponse.Education,
		Summary:            analysisResponse.Summary,
		JobRecommendations: analysisResponse.JobRecommendations,
		Strengths:          analysisResponse.Strengths,
		Weaknesses:         analysisResponse.Weaknesses,
	}

	if err := a.analysisRepo.CreateProfile(ctx, profile); err != nil {
		a.handleError(ctx, jobID, fmt.Sprintf("Failed to save profile: %v", err))
		return
	}

	// Complete the job
	if err := a.analysisRepo.CompleteJob(ctx, jobID); err != nil {
		log.Printf("Failed to mark job as completed: %v", err)
	}

	duration := time.Since(startTime)
	log.Printf("Analysis job %s completed in %v", jobID, duration)
}

// updateProgress updates the job progress
func (a *DefaultResumeAnalyzer) updateProgress(ctx context.Context, jobID, status string, progress int, step string) error {
	return a.analysisRepo.UpdateJobStatus(ctx, jobID, status, progress, step)
}

// handleError handles job errors
func (a *DefaultResumeAnalyzer) handleError(ctx context.Context, jobID, errorMsg string) {
	log.Printf("Job %s failed: %s", jobID, errorMsg)
	if err := a.analysisRepo.UpdateJobError(ctx, jobID, errorMsg); err != nil {
		log.Printf("Failed to update job error: %v", err)
	}
}

// GetStatus retrieves the current status of an analysis job
func (a *DefaultResumeAnalyzer) GetStatus(ctx context.Context, jobID string) (*models.AnalysisStatus, error) {
	job, err := a.analysisRepo.GetJobByID(ctx, jobID)
	if err != nil {
		return nil, err
	}

	status := &models.AnalysisStatus{
		JobID:         job.JobID,
		Status:        job.Status,
		Progress:      job.Progress,
		CurrentStep:   job.CurrentStep,
		ExtractedText: job.ExtractedText,
		CreatedAt:     job.CreatedAt,
		UpdatedAt:     job.UpdatedAt,
		CompletedAt:   job.CompletedAt,
		ErrorMessage:  job.ErrorMessage,
	}

	return status, nil
}

// GetResult retrieves the complete analysis result for a completed job
func (a *DefaultResumeAnalyzer) GetResult(ctx context.Context, jobID string) (*models.AnalysisResult, error) {
	// Get job to verify it's completed
	job, err := a.analysisRepo.GetJobByID(ctx, jobID)
	if err != nil {
		return nil, err
	}

	if job.Status != "completed" {
		return nil, fmt.Errorf("job is not completed yet (status: %s)", job.Status)
	}

	// Get profile
	profile, err := a.analysisRepo.GetProfileByJobID(ctx, jobID)
	if err != nil {
		return nil, err
	}

	result := &models.AnalysisResult{
		JobID:              profile.JobID,
		Status:             job.Status,
		UploadID:           profile.UploadID,
		Name:               profile.Name,
		Email:              profile.Email,
		Phone:              profile.Phone,
		Age:                profile.Age,
		Race:               profile.Race,
		Location:           profile.Location,
		TotalWorkYears:     profile.TotalWorkYears,
		Skills:             profile.Skills,
		Experience:         profile.Experience,
		Education:          profile.Education,
		Summary:            profile.Summary,
		JobRecommendations: profile.JobRecommendations,
		Strengths:          profile.Strengths,
		Weaknesses:         profile.Weaknesses,
		CreatedAt:          profile.CreatedAt,
		CompletedAt:        job.CompletedAt,
	}

	return result, nil
}

// SearchSimilarResumes finds similar resumes using vector similarity
func (a *DefaultResumeAnalyzer) SearchSimilarResumes(ctx context.Context, query string, limit int) ([]*models.UserProfile, error) {
	// Search vector store
	searchResults, err := a.vectorStore.SearchSimilar(ctx, query, limit)
	if err != nil {
		return nil, fmt.Errorf("vector search failed: %w", err)
	}

	// Get unique upload IDs
	uploadIDSet := make(map[int]bool)
	var uploadIDs []int
	for _, result := range searchResults {
		if !uploadIDSet[result.UploadID] {
			uploadIDSet[result.UploadID] = true
			uploadIDs = append(uploadIDs, result.UploadID)
		}
	}

	// Retrieve profiles for these uploads
	var profiles []*models.UserProfile
	for _, uploadID := range uploadIDs {
		profile, err := a.analysisRepo.GetProfileByUploadID(ctx, uploadID)
		if err != nil {
			log.Printf("Warning: failed to get profile for upload %d: %v", uploadID, err)
			continue
		}
		profiles = append(profiles, profile)
	}

	return profiles, nil
}
