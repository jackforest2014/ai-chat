package repository

import (
	"context"

	"github.com/your-org/websocket-server/pkg/models"
)

// ChatMessageRepository defines the interface for chat message operations
type ChatMessageRepository interface {
	// CreateMessage creates a new chat message
	CreateMessage(ctx context.Context, msg *models.ChatMessage) error

	// GetMessageByID retrieves a message by ID
	GetMessageByID(ctx context.Context, id int64) (*models.ChatMessage, error)

	// GetMessageContent retrieves the binary content of a message
	GetMessageContent(ctx context.Context, id int64) ([]byte, error)

	// GetMessages retrieves messages for a user with pagination
	GetMessages(ctx context.Context, userID, limit, offset int) ([]*models.ChatMessage, error)

	// GetMessagesBySession retrieves messages for a specific session
	GetMessagesBySession(ctx context.Context, sessionID string, limit, offset int) ([]*models.ChatMessage, error)

	// GetConversation retrieves messages between two users
	GetConversation(ctx context.Context, userID1, userID2, limit, offset int) ([]*models.ChatMessage, error)

	// CountMessages counts total messages for a user
	CountMessages(ctx context.Context, userID int) (int, error)

	// DeleteMessage deletes a message by ID
	DeleteMessage(ctx context.Context, id int64) error
}
