package postgres

import (
	"context"
	"database/sql"
	"fmt"

	"github.com/your-org/websocket-server/internal/repository"
	"github.com/your-org/websocket-server/pkg/models"
)

// ChatMessagePostgresRepository implements ChatMessageRepository for PostgreSQL
type ChatMessagePostgresRepository struct {
	db *sql.DB
}

// NewChatMessagePostgresRepository creates a new chat message repository
func NewChatMessagePostgresRepository(db *sql.DB) repository.ChatMessageRepository {
	return &ChatMessagePostgresRepository{db: db}
}

// CreateMessage creates a new chat message
func (r *ChatMessagePostgresRepository) CreateMessage(ctx context.Context, msg *models.ChatMessage) error {
	query := `
		INSERT INTO chat_messages (user_id, to_user_id, msg_type, text_content, content, metadata, session_id)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
		RETURNING id, created_at
	`

	// Handle nil metadata - PostgreSQL JSONB requires valid JSON or NULL
	var metadata interface{}
	if len(msg.Metadata) > 0 {
		metadata = msg.Metadata
	} else {
		metadata = nil
	}

	err := r.db.QueryRowContext(
		ctx, query,
		msg.UserID,
		msg.ToUserID,
		msg.MsgType,
		msg.TextContent,
		msg.Content,
		metadata,
		msg.SessionID,
	).Scan(&msg.ID, &msg.CreatedAt)

	if err != nil {
		return fmt.Errorf("failed to create chat message: %w", err)
	}

	return nil
}

// GetMessageByID retrieves a message by ID
func (r *ChatMessagePostgresRepository) GetMessageByID(ctx context.Context, id int64) (*models.ChatMessage, error) {
	query := `
		SELECT id, user_id, to_user_id, msg_type, text_content, metadata, session_id, created_at
		FROM chat_messages
		WHERE id = $1
	`

	msg := &models.ChatMessage{}
	err := r.db.QueryRowContext(ctx, query, id).Scan(
		&msg.ID,
		&msg.UserID,
		&msg.ToUserID,
		&msg.MsgType,
		&msg.TextContent,
		&msg.Metadata,
		&msg.SessionID,
		&msg.CreatedAt,
	)

	if err == sql.ErrNoRows {
		return nil, fmt.Errorf("message not found: %d", id)
	}
	if err != nil {
		return nil, fmt.Errorf("failed to get message: %w", err)
	}

	return msg, nil
}

// GetMessageContent retrieves the binary content of a message
func (r *ChatMessagePostgresRepository) GetMessageContent(ctx context.Context, id int64) ([]byte, error) {
	query := `SELECT content FROM chat_messages WHERE id = $1`

	var content []byte
	err := r.db.QueryRowContext(ctx, query, id).Scan(&content)

	if err == sql.ErrNoRows {
		return nil, fmt.Errorf("message not found: %d", id)
	}
	if err != nil {
		return nil, fmt.Errorf("failed to get message content: %w", err)
	}

	return content, nil
}

// GetMessages retrieves messages for a user with pagination
func (r *ChatMessagePostgresRepository) GetMessages(ctx context.Context, userID, limit, offset int) ([]*models.ChatMessage, error) {
	query := `
		SELECT id, user_id, to_user_id, msg_type, text_content, metadata, session_id, created_at
		FROM chat_messages
		WHERE user_id = $1 OR to_user_id = $1
		ORDER BY created_at DESC
		LIMIT $2 OFFSET $3
	`

	rows, err := r.db.QueryContext(ctx, query, userID, limit, offset)
	if err != nil {
		return nil, fmt.Errorf("failed to get messages: %w", err)
	}
	defer rows.Close()

	return scanMessages(rows)
}

// GetMessagesBySession retrieves messages for a specific session
func (r *ChatMessagePostgresRepository) GetMessagesBySession(ctx context.Context, sessionID string, limit, offset int) ([]*models.ChatMessage, error) {
	query := `
		SELECT id, user_id, to_user_id, msg_type, text_content, metadata, session_id, created_at
		FROM chat_messages
		WHERE session_id = $1
		ORDER BY created_at ASC
		LIMIT $2 OFFSET $3
	`

	rows, err := r.db.QueryContext(ctx, query, sessionID, limit, offset)
	if err != nil {
		return nil, fmt.Errorf("failed to get messages by session: %w", err)
	}
	defer rows.Close()

	return scanMessages(rows)
}

// GetConversation retrieves messages between two users
func (r *ChatMessagePostgresRepository) GetConversation(ctx context.Context, userID1, userID2, limit, offset int) ([]*models.ChatMessage, error) {
	query := `
		SELECT id, user_id, to_user_id, msg_type, text_content, metadata, session_id, created_at
		FROM chat_messages
		WHERE (user_id = $1 AND to_user_id = $2) OR (user_id = $2 AND to_user_id = $1)
		ORDER BY created_at DESC
		LIMIT $3 OFFSET $4
	`

	rows, err := r.db.QueryContext(ctx, query, userID1, userID2, limit, offset)
	if err != nil {
		return nil, fmt.Errorf("failed to get conversation: %w", err)
	}
	defer rows.Close()

	return scanMessages(rows)
}

// CountMessages counts total messages for a user
func (r *ChatMessagePostgresRepository) CountMessages(ctx context.Context, userID int) (int, error) {
	query := `
		SELECT COUNT(*)
		FROM chat_messages
		WHERE user_id = $1 OR to_user_id = $1
	`

	var count int
	err := r.db.QueryRowContext(ctx, query, userID).Scan(&count)
	if err != nil {
		return 0, fmt.Errorf("failed to count messages: %w", err)
	}

	return count, nil
}

// DeleteMessage deletes a message by ID
func (r *ChatMessagePostgresRepository) DeleteMessage(ctx context.Context, id int64) error {
	query := `DELETE FROM chat_messages WHERE id = $1`

	result, err := r.db.ExecContext(ctx, query, id)
	if err != nil {
		return fmt.Errorf("failed to delete message: %w", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to get rows affected: %w", err)
	}

	if rowsAffected == 0 {
		return fmt.Errorf("message not found: %d", id)
	}

	return nil
}

// Helper function to scan message rows
func scanMessages(rows *sql.Rows) ([]*models.ChatMessage, error) {
	var messages []*models.ChatMessage
	for rows.Next() {
		msg := &models.ChatMessage{}
		err := rows.Scan(
			&msg.ID,
			&msg.UserID,
			&msg.ToUserID,
			&msg.MsgType,
			&msg.TextContent,
			&msg.Metadata,
			&msg.SessionID,
			&msg.CreatedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan message: %w", err)
		}
		messages = append(messages, msg)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("rows iteration error: %w", err)
	}

	return messages, nil
}
