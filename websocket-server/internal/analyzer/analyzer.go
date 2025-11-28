package analyzer

import (
	"context"

	"github.com/your-org/websocket-server/pkg/models"
)

// ResumeAnalyzer is the main interface for resume analysis operations
type ResumeAnalyzer interface {
	// AnalyzeAsync starts an asynchronous analysis job for a resume
	AnalyzeAsync(ctx context.Context, uploadID int, userID *int) (jobID string, err error)

	// GetStatus retrieves the current status of an analysis job
	GetStatus(ctx context.Context, jobID string) (*models.AnalysisStatus, error)

	// GetResult retrieves the complete analysis result for a completed job
	GetResult(ctx context.Context, jobID string) (*models.AnalysisResult, error)

	// SearchSimilarResumes finds similar resumes using vector similarity
	SearchSimilarResumes(ctx context.Context, query string, limit int) ([]*models.UserProfile, error)

	// GetJobsByUserID retrieves all analysis jobs for a specific user
	GetJobsByUserID(ctx context.Context, userID int) ([]*models.AnalysisJob, error)

	// GetJobsByUploadID retrieves all analysis jobs for a specific upload
	GetJobsByUploadID(ctx context.Context, uploadID int) ([]*models.AnalysisJob, error)
}

// TextExtractor extracts text content from various file formats
type TextExtractor interface {
	// ExtractText extracts text from a file based on its MIME type
	ExtractText(ctx context.Context, fileContent []byte, mimeType string) (string, error)
}

// TextChunker splits text into chunks for embedding
type TextChunker interface {
	// ChunkText splits text into semantic chunks
	ChunkText(text string, chunkSize int, overlap int) ([]string, error)
}

// EmbeddingGenerator generates vector embeddings from text
type EmbeddingGenerator interface {
	// GenerateEmbedding creates a vector embedding for the given text
	GenerateEmbedding(ctx context.Context, text string) ([]float32, error)

	// GenerateEmbeddings creates vector embeddings for multiple texts
	GenerateEmbeddings(ctx context.Context, texts []string) ([][]float32, error)
}

// VectorStore manages storage and retrieval of embeddings
type VectorStore interface {
	// StoreEmbeddings stores embeddings with metadata in the vector database
	StoreEmbeddings(ctx context.Context, uploadID int, chunks []string, embeddings [][]float32) error

	// SearchSimilar finds similar vectors using cosine similarity
	SearchSimilar(ctx context.Context, query string, limit int) ([]SearchResult, error)

	// DeleteByUploadID removes all embeddings associated with an upload
	DeleteByUploadID(ctx context.Context, uploadID int) error
}

// SearchResult represents a vector similarity search result
type SearchResult struct {
	UploadID int
	Chunk    string
	Score    float32
}

// LLMClient interfaces with external LLM APIs for analysis
type LLMClient interface {
	// Analyze sends resume text and retrieved context to the LLM for analysis
	Analyze(ctx context.Context, request *AnalysisRequest) (*AnalysisResponse, error)

	// GenerateFromPrompt sends a raw prompt to the LLM and returns the response
	// This is used for non-resume tasks like generating interview questions
	GenerateFromPrompt(ctx context.Context, prompt string) (string, error)
}

// AnalysisRequest contains all information needed for LLM analysis
type AnalysisRequest struct {
	ResumeText       string
	RetrievedChunks  []string
	LinkedInURL      *string
}

// AnalysisResponse contains structured analysis results from the LLM
type AnalysisResponse struct {
	Name               *string
	Email              *string
	Phone              *string
	LinkedInURL        *string
	Age                *int
	Race               *string
	Location           *string
	TotalWorkYears     *float64
	Skills             map[string][]string
	Experience         []models.ExperienceEntry
	Education          []models.EducationEntry
	Summary            *string
	JobRecommendations []string
	Strengths          []string
	Weaknesses         []string
}
