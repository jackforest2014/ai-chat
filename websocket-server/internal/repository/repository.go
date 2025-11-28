package repository

import (
	"context"

	"github.com/your-org/websocket-server/pkg/models"
)

// UploadRepository defines the interface for upload data operations
// This abstraction allows us to swap database implementations (e.g., PostgreSQL, MySQL, MongoDB)
// without changing the business logic
type UploadRepository interface {
	// CreateUpload stores a new upload record in the database
	CreateUpload(ctx context.Context, upload *models.Upload) error

	// GetUploadByID retrieves an upload record by its ID
	GetUploadByID(ctx context.Context, id int) (*models.Upload, error)

	// ListUploads retrieves all upload records with pagination support
	ListUploads(ctx context.Context, limit, offset int) ([]*models.Upload, error)

	// ListUploadsByUserID retrieves upload records for a specific user with pagination
	ListUploadsByUserID(ctx context.Context, userID, limit, offset int) ([]*models.Upload, error)

	// DeleteUpload removes an upload record by its ID
	DeleteUpload(ctx context.Context, id int) error

	// GetUploadFileContent retrieves only the file content for a specific upload
	// Separated from GetUploadByID for performance (avoid loading large BYTEA unnecessarily)
	GetUploadFileContent(ctx context.Context, id int) ([]byte, error)

	// Close closes the database connection and releases resources
	Close() error
}
