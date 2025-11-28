package repository

import (
	"context"

	"github.com/your-org/websocket-server/pkg/models"
)

// UserRepository defines the interface for user data operations
type UserRepository interface {
	// CreateUser creates a new user account
	CreateUser(ctx context.Context, user *models.User) (*models.User, error)

	// GetUserByEmail retrieves a user by email address
	GetUserByEmail(ctx context.Context, email string) (*models.User, error)

	// GetUserByID retrieves a user by ID
	GetUserByID(ctx context.Context, id int) (*models.User, error)

	// EmailExists checks if an email is already registered
	EmailExists(ctx context.Context, email string) (bool, error)
}
