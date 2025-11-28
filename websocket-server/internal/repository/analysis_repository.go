package repository

import (
	"context"

	"github.com/your-org/websocket-server/pkg/models"
)

// AnalysisRepository defines operations for analysis jobs and user profiles
type AnalysisRepository interface {
	// Job operations
	CreateJob(ctx context.Context, job *models.AnalysisJob) error
	GetJobByID(ctx context.Context, jobID string) (*models.AnalysisJob, error)
	GetJobsByUserID(ctx context.Context, userID int) ([]*models.AnalysisJob, error)
	GetJobsByUploadID(ctx context.Context, uploadID int) ([]*models.AnalysisJob, error)
	UpdateJobStatus(ctx context.Context, jobID string, status string, progress int, currentStep string) error
	UpdateExtractedText(ctx context.Context, jobID string, extractedText string) error
	UpdateJobError(ctx context.Context, jobID string, errorMessage string) error
	CompleteJob(ctx context.Context, jobID string) error

	// Profile operations
	CreateProfile(ctx context.Context, profile *models.UserProfile) error
	GetProfileByJobID(ctx context.Context, jobID string) (*models.UserProfile, error)
	GetProfileByUploadID(ctx context.Context, uploadID int) (*models.UserProfile, error)
	UpdateProfile(ctx context.Context, profile *models.UserProfile) error

	// Delete operations
	DeleteJobsByUploadID(ctx context.Context, uploadID int) error
	DeleteProfilesByUploadID(ctx context.Context, uploadID int) error
	DeleteJob(ctx context.Context, jobID string) error
}
