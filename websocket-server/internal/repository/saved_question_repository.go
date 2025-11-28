package repository

import (
	"context"

	"github.com/your-org/websocket-server/pkg/models"
)

// SavedQuestionRepository defines the interface for saved question operations
type SavedQuestionRepository interface {
	// SaveQuestion saves a question and answer pair for a user
	SaveQuestion(ctx context.Context, req *models.SaveQuestionRequest) (*models.SavedInterviewQuestion, error)

	// SaveQuestionWithEmbedding saves a question with its embedding
	SaveQuestionWithEmbedding(ctx context.Context, req *models.SaveQuestionRequest, embedding []byte) (*models.SavedInterviewQuestion, error)

	// GetSavedQuestions retrieves all saved questions for a user
	GetSavedQuestions(ctx context.Context, userID string, limit, offset int) ([]*models.SavedInterviewQuestion, error)

	// GetSavedQuestionsByAuthUserID retrieves saved questions for an authenticated user
	GetSavedQuestionsByAuthUserID(ctx context.Context, authUserID, limit, offset int) ([]*models.SavedInterviewQuestion, error)

	// GetSavedQuestionsByJob retrieves saved questions for a specific job
	GetSavedQuestionsByJob(ctx context.Context, userID, jobID string) ([]*models.SavedInterviewQuestion, error)

	// IsSaved checks if a question is already saved
	IsSaved(ctx context.Context, userID, jobID, questionID string) (bool, error)

	// DeleteSavedQuestion deletes a saved question
	DeleteSavedQuestion(ctx context.Context, userID, jobID, questionID string) error

	// UpdateAnswer updates the answer for a saved question
	UpdateAnswer(ctx context.Context, userID, jobID, questionID, newAnswer string) error
}
