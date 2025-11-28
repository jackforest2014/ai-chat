package postgres

import (
	"context"
	"database/sql"
	"fmt"
	"log"
	"time"

	_ "github.com/lib/pq" // PostgreSQL driver
	"github.com/your-org/websocket-server/internal/repository"
	"github.com/your-org/websocket-server/pkg/models"
)

// PostgresRepository implements the UploadRepository interface for PostgreSQL
type PostgresRepository struct {
	db *sql.DB
}

// NewPostgresRepository creates a new PostgreSQL repository instance
func NewPostgresRepository(connectionString string) (repository.UploadRepository, error) {
	db, err := sql.Open("postgres", connectionString)
	if err != nil {
		return nil, fmt.Errorf("failed to open database connection: %w", err)
	}

	// Configure connection pool
	db.SetMaxOpenConns(25)
	db.SetMaxIdleConns(5)
	db.SetConnMaxLifetime(5 * time.Minute)

	// Verify connection
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if err := db.PingContext(ctx); err != nil {
		return nil, fmt.Errorf("failed to ping database: %w", err)
	}

	log.Println("PostgreSQL connection established successfully")

	return &PostgresRepository{db: db}, nil
}

// GetDB returns the underlying database connection
// This is used by other repositories that need to share the same connection
func (r *PostgresRepository) GetDB() *sql.DB {
	return r.db
}

// CreateUpload stores a new upload record in the database
func (r *PostgresRepository) CreateUpload(ctx context.Context, upload *models.Upload) error {
	query := `
		INSERT INTO user_uploads (user_id, linkedin_url, file_name, file_content, file_size, mime_type)
		VALUES ($1, $2, $3, $4, $5, $6)
		RETURNING id, created_at, updated_at
	`

	err := r.db.QueryRowContext(
		ctx,
		query,
		upload.UserID,
		upload.LinkedinURL,
		upload.FileName,
		upload.FileContent,
		upload.FileSize,
		upload.MimeType,
	).Scan(&upload.ID, &upload.CreatedAt, &upload.UpdatedAt)

	if err != nil {
		return fmt.Errorf("failed to create upload: %w", err)
	}

	log.Printf("Upload created successfully with ID: %d for user: %v", upload.ID, upload.UserID)
	return nil
}

// GetUploadByID retrieves an upload record by its ID (without file content)
func (r *PostgresRepository) GetUploadByID(ctx context.Context, id int) (*models.Upload, error) {
	query := `
		SELECT id, user_id, linkedin_url, file_name, file_size, mime_type, created_at, updated_at
		FROM user_uploads
		WHERE id = $1
	`

	upload := &models.Upload{}
	err := r.db.QueryRowContext(ctx, query, id).Scan(
		&upload.ID,
		&upload.UserID,
		&upload.LinkedinURL,
		&upload.FileName,
		&upload.FileSize,
		&upload.MimeType,
		&upload.CreatedAt,
		&upload.UpdatedAt,
	)

	if err == sql.ErrNoRows {
		return nil, fmt.Errorf("upload not found with ID: %d", id)
	}
	if err != nil {
		return nil, fmt.Errorf("failed to get upload: %w", err)
	}

	return upload, nil
}

// ListUploads retrieves all upload records with pagination support
func (r *PostgresRepository) ListUploads(ctx context.Context, limit, offset int) ([]*models.Upload, error) {
	query := `
		SELECT
			u.id,
			u.user_id,
			u.linkedin_url,
			u.file_name,
			u.file_size,
			u.mime_type,
			u.created_at,
			u.updated_at,
			(
				SELECT aj.job_id
				FROM analysis_jobs aj
				WHERE aj.upload_id = u.id
				ORDER BY
					CASE WHEN aj.status = 'completed' THEN 0 ELSE 1 END,
					aj.created_at DESC
				LIMIT 1
			) as job_id
		FROM user_uploads u
		ORDER BY u.created_at DESC
		LIMIT $1 OFFSET $2
	`

	rows, err := r.db.QueryContext(ctx, query, limit, offset)
	if err != nil {
		return nil, fmt.Errorf("failed to list uploads: %w", err)
	}
	defer rows.Close()

	var uploads []*models.Upload
	for rows.Next() {
		upload := &models.Upload{}
		err := rows.Scan(
			&upload.ID,
			&upload.UserID,
			&upload.LinkedinURL,
			&upload.FileName,
			&upload.FileSize,
			&upload.MimeType,
			&upload.CreatedAt,
			&upload.UpdatedAt,
			&upload.JobID,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan upload row: %w", err)
		}
		uploads = append(uploads, upload)
	}

	if err = rows.Err(); err != nil {
		return nil, fmt.Errorf("error iterating upload rows: %w", err)
	}

	return uploads, nil
}

// ListUploadsByUserID retrieves upload records for a specific user with pagination
func (r *PostgresRepository) ListUploadsByUserID(ctx context.Context, userID, limit, offset int) ([]*models.Upload, error) {
	query := `
		SELECT
			u.id,
			u.user_id,
			u.linkedin_url,
			u.file_name,
			u.file_size,
			u.mime_type,
			u.created_at,
			u.updated_at,
			(
				SELECT aj.job_id
				FROM analysis_jobs aj
				WHERE aj.upload_id = u.id
				ORDER BY
					CASE WHEN aj.status = 'completed' THEN 0 ELSE 1 END,
					aj.created_at DESC
				LIMIT 1
			) as job_id
		FROM user_uploads u
		WHERE u.user_id = $1
		ORDER BY u.created_at DESC
		LIMIT $2 OFFSET $3
	`

	rows, err := r.db.QueryContext(ctx, query, userID, limit, offset)
	if err != nil {
		return nil, fmt.Errorf("failed to list uploads by user: %w", err)
	}
	defer rows.Close()

	var uploads []*models.Upload
	for rows.Next() {
		upload := &models.Upload{}
		err := rows.Scan(
			&upload.ID,
			&upload.UserID,
			&upload.LinkedinURL,
			&upload.FileName,
			&upload.FileSize,
			&upload.MimeType,
			&upload.CreatedAt,
			&upload.UpdatedAt,
			&upload.JobID,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan upload row: %w", err)
		}
		uploads = append(uploads, upload)
	}

	if err = rows.Err(); err != nil {
		return nil, fmt.Errorf("error iterating upload rows: %w", err)
	}

	return uploads, nil
}

// DeleteUpload removes an upload record by its ID
func (r *PostgresRepository) DeleteUpload(ctx context.Context, id int) error {
	query := `DELETE FROM user_uploads WHERE id = $1`

	result, err := r.db.ExecContext(ctx, query, id)
	if err != nil {
		return fmt.Errorf("failed to delete upload: %w", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to get rows affected: %w", err)
	}

	if rowsAffected == 0 {
		return fmt.Errorf("upload not found with ID: %d", id)
	}

	log.Printf("Upload deleted successfully with ID: %d", id)
	return nil
}

// GetUploadFileContent retrieves only the file content for a specific upload
func (r *PostgresRepository) GetUploadFileContent(ctx context.Context, id int) ([]byte, error) {
	query := `SELECT file_content FROM user_uploads WHERE id = $1`

	var fileContent []byte
	err := r.db.QueryRowContext(ctx, query, id).Scan(&fileContent)

	if err == sql.ErrNoRows {
		return nil, fmt.Errorf("upload not found with ID: %d", id)
	}
	if err != nil {
		return nil, fmt.Errorf("failed to get file content: %w", err)
	}

	return fileContent, nil
}

// Close closes the database connection and releases resources
func (r *PostgresRepository) Close() error {
	if r.db != nil {
		log.Println("Closing PostgreSQL database connection")
		return r.db.Close()
	}
	return nil
}
