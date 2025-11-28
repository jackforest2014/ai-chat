package models

import (
	"time"

	"github.com/lib/pq"
)

// SavedInterviewQuestion represents a saved interview question and answer
type SavedInterviewQuestion struct {
	ID                int64          `json:"id" db:"id"`
	AuthUserID        *int           `json:"auth_user_id,omitempty" db:"auth_user_id"` // Reference to authenticated user
	UserID            string         `json:"user_id" db:"user_id"`
	JobID             string         `json:"job_id" db:"job_id"`
	QuestionID        string         `json:"question_id" db:"question_id"`
	Question          string         `json:"question" db:"question"`
	Answer            string         `json:"answer" db:"answer"`
	Category          *string        `json:"category,omitempty" db:"category"`
	Difficulty        *string        `json:"difficulty,omitempty" db:"difficulty"`
	Tags              pq.StringArray `json:"tags" db:"tags"`
	JobTitle          *string        `json:"job_title,omitempty" db:"job_title"`
	Company           *string        `json:"company,omitempty" db:"company"`
	QuestionEmbedding []byte         `json:"-" db:"question_embedding"` // Serialized float32 embedding
	CreatedAt         time.Time      `json:"created_at" db:"created_at"`
	UpdatedAt         time.Time      `json:"updated_at" db:"updated_at"`
}

// SaveQuestionRequest represents a request to save a question
type SaveQuestionRequest struct {
	AuthUserID *int     `json:"auth_user_id,omitempty"` // Reference to authenticated user
	UserID     string   `json:"user_id"`
	JobID      string   `json:"job_id"`
	QuestionID string   `json:"question_id"`
	Question   string   `json:"question"`
	Answer     string   `json:"answer"`
	Category   string   `json:"category"`
	Difficulty string   `json:"difficulty"`
	Tags       []string `json:"tags"`
	JobTitle   string   `json:"job_title"`
	Company    string   `json:"company"`
}
