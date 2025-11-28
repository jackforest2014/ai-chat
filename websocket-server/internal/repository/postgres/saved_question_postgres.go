package postgres

import (
	"context"
	"database/sql"
	"fmt"

	"github.com/lib/pq"
	"github.com/your-org/websocket-server/internal/repository"
	"github.com/your-org/websocket-server/pkg/models"
)

// SavedQuestionPostgresRepository implements SavedQuestionRepository using PostgreSQL
type SavedQuestionPostgresRepository struct {
	db *sql.DB
}

// NewSavedQuestionRepository creates a new saved question repository
func NewSavedQuestionRepository(db *sql.DB) repository.SavedQuestionRepository {
	return &SavedQuestionPostgresRepository{db: db}
}

// SaveQuestion saves a question and answer pair for a user
func (r *SavedQuestionPostgresRepository) SaveQuestion(ctx context.Context, req *models.SaveQuestionRequest) (*models.SavedInterviewQuestion, error) {
	return r.SaveQuestionWithEmbedding(ctx, req, nil)
}

// SaveQuestionWithEmbedding saves a question with its embedding
func (r *SavedQuestionPostgresRepository) SaveQuestionWithEmbedding(ctx context.Context, req *models.SaveQuestionRequest, embedding []byte) (*models.SavedInterviewQuestion, error) {
	query := `
		INSERT INTO saved_interview_questions (
			auth_user_id, user_id, job_id, question_id, question, answer,
			category, difficulty, tags, job_title, company, question_embedding
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
		ON CONFLICT (user_id, job_id, question_id)
		DO UPDATE SET
			auth_user_id = COALESCE(EXCLUDED.auth_user_id, saved_interview_questions.auth_user_id),
			answer = EXCLUDED.answer,
			category = EXCLUDED.category,
			difficulty = EXCLUDED.difficulty,
			tags = EXCLUDED.tags,
			question_embedding = EXCLUDED.question_embedding,
			updated_at = CURRENT_TIMESTAMP
		RETURNING id, auth_user_id, user_id, job_id, question_id, question, answer,
			category, difficulty, tags, job_title, company, question_embedding, created_at, updated_at
	`

	var saved models.SavedInterviewQuestion
	err := r.db.QueryRowContext(
		ctx, query,
		req.AuthUserID, req.UserID, req.JobID, req.QuestionID, req.Question, req.Answer,
		nullString(req.Category), nullString(req.Difficulty),
		pq.Array(req.Tags), nullString(req.JobTitle), nullString(req.Company),
		embedding,
	).Scan(
		&saved.ID, &saved.AuthUserID, &saved.UserID, &saved.JobID, &saved.QuestionID,
		&saved.Question, &saved.Answer, &saved.Category, &saved.Difficulty,
		&saved.Tags, &saved.JobTitle, &saved.Company, &saved.QuestionEmbedding,
		&saved.CreatedAt, &saved.UpdatedAt,
	)

	if err != nil {
		return nil, fmt.Errorf("failed to save question: %w", err)
	}

	return &saved, nil
}

// GetSavedQuestions retrieves all saved questions for a user with pagination
func (r *SavedQuestionPostgresRepository) GetSavedQuestions(ctx context.Context, userID string, limit, offset int) ([]*models.SavedInterviewQuestion, error) {
	query := `
		SELECT id, auth_user_id, user_id, job_id, question_id, question, answer,
			category, difficulty, tags, job_title, company, question_embedding, created_at, updated_at
		FROM saved_interview_questions
		WHERE user_id = $1
		ORDER BY created_at DESC
		LIMIT $2 OFFSET $3
	`

	rows, err := r.db.QueryContext(ctx, query, userID, limit, offset)
	if err != nil {
		return nil, fmt.Errorf("failed to query saved questions: %w", err)
	}
	defer rows.Close()

	var questions []*models.SavedInterviewQuestion
	for rows.Next() {
		var q models.SavedInterviewQuestion
		err := rows.Scan(
			&q.ID, &q.AuthUserID, &q.UserID, &q.JobID, &q.QuestionID,
			&q.Question, &q.Answer, &q.Category, &q.Difficulty,
			&q.Tags, &q.JobTitle, &q.Company, &q.QuestionEmbedding,
			&q.CreatedAt, &q.UpdatedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan saved question: %w", err)
		}
		questions = append(questions, &q)
	}

	if err = rows.Err(); err != nil {
		return nil, fmt.Errorf("rows iteration error: %w", err)
	}

	return questions, nil
}

// GetSavedQuestionsByAuthUserID retrieves saved questions for an authenticated user
func (r *SavedQuestionPostgresRepository) GetSavedQuestionsByAuthUserID(ctx context.Context, authUserID, limit, offset int) ([]*models.SavedInterviewQuestion, error) {
	query := `
		SELECT id, auth_user_id, user_id, job_id, question_id, question, answer,
			category, difficulty, tags, job_title, company, question_embedding, created_at, updated_at
		FROM saved_interview_questions
		WHERE auth_user_id = $1
		ORDER BY created_at DESC
		LIMIT $2 OFFSET $3
	`

	rows, err := r.db.QueryContext(ctx, query, authUserID, limit, offset)
	if err != nil {
		return nil, fmt.Errorf("failed to query saved questions by auth user: %w", err)
	}
	defer rows.Close()

	var questions []*models.SavedInterviewQuestion
	for rows.Next() {
		var q models.SavedInterviewQuestion
		err := rows.Scan(
			&q.ID, &q.AuthUserID, &q.UserID, &q.JobID, &q.QuestionID,
			&q.Question, &q.Answer, &q.Category, &q.Difficulty,
			&q.Tags, &q.JobTitle, &q.Company, &q.QuestionEmbedding,
			&q.CreatedAt, &q.UpdatedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan saved question: %w", err)
		}
		questions = append(questions, &q)
	}

	if err = rows.Err(); err != nil {
		return nil, fmt.Errorf("rows iteration error: %w", err)
	}

	return questions, nil
}

// GetSavedQuestionsByJob retrieves saved questions for a specific job
func (r *SavedQuestionPostgresRepository) GetSavedQuestionsByJob(ctx context.Context, userID, jobID string) ([]*models.SavedInterviewQuestion, error) {
	query := `
		SELECT id, auth_user_id, user_id, job_id, question_id, question, answer,
			category, difficulty, tags, job_title, company, question_embedding, created_at, updated_at
		FROM saved_interview_questions
		WHERE user_id = $1 AND job_id = $2
		ORDER BY created_at DESC
	`

	rows, err := r.db.QueryContext(ctx, query, userID, jobID)
	if err != nil {
		return nil, fmt.Errorf("failed to query saved questions by job: %w", err)
	}
	defer rows.Close()

	var questions []*models.SavedInterviewQuestion
	for rows.Next() {
		var q models.SavedInterviewQuestion
		err := rows.Scan(
			&q.ID, &q.AuthUserID, &q.UserID, &q.JobID, &q.QuestionID,
			&q.Question, &q.Answer, &q.Category, &q.Difficulty,
			&q.Tags, &q.JobTitle, &q.Company, &q.QuestionEmbedding,
			&q.CreatedAt, &q.UpdatedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan saved question: %w", err)
		}
		questions = append(questions, &q)
	}

	if err = rows.Err(); err != nil {
		return nil, fmt.Errorf("rows iteration error: %w", err)
	}

	return questions, nil
}

// IsSaved checks if a question is already saved
func (r *SavedQuestionPostgresRepository) IsSaved(ctx context.Context, userID, jobID, questionID string) (bool, error) {
	query := `
		SELECT EXISTS (
			SELECT 1 FROM saved_interview_questions
			WHERE user_id = $1 AND job_id = $2 AND question_id = $3
		)
	`

	var exists bool
	err := r.db.QueryRowContext(ctx, query, userID, jobID, questionID).Scan(&exists)
	if err != nil {
		return false, fmt.Errorf("failed to check if question is saved: %w", err)
	}

	return exists, nil
}

// DeleteSavedQuestion deletes a saved question
func (r *SavedQuestionPostgresRepository) DeleteSavedQuestion(ctx context.Context, userID, jobID, questionID string) error {
	query := `
		DELETE FROM saved_interview_questions
		WHERE user_id = $1 AND job_id = $2 AND question_id = $3
	`

	result, err := r.db.ExecContext(ctx, query, userID, jobID, questionID)
	if err != nil {
		return fmt.Errorf("failed to delete saved question: %w", err)
	}

	rows, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to get rows affected: %w", err)
	}

	if rows == 0 {
		return fmt.Errorf("question not found")
	}

	return nil
}

// UpdateAnswer updates the answer for a saved question
func (r *SavedQuestionPostgresRepository) UpdateAnswer(ctx context.Context, userID, jobID, questionID, newAnswer string) error {
	query := `
		UPDATE saved_interview_questions
		SET answer = $1, updated_at = CURRENT_TIMESTAMP
		WHERE user_id = $2 AND job_id = $3 AND question_id = $4
	`

	result, err := r.db.ExecContext(ctx, query, newAnswer, userID, jobID, questionID)
	if err != nil {
		return fmt.Errorf("failed to update answer: %w", err)
	}

	rows, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to get rows affected: %w", err)
	}

	if rows == 0 {
		return fmt.Errorf("question not found")
	}

	return nil
}

// nullString converts an empty string to sql.NullString
func nullString(s string) sql.NullString {
	if s == "" {
		return sql.NullString{Valid: false}
	}
	return sql.NullString{String: s, Valid: true}
}
