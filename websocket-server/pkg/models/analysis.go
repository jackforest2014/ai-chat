package models

import (
	"time"
)

// AnalysisJob represents an asynchronous resume analysis job
type AnalysisJob struct {
	ID            int        `json:"id"`
	JobID         string     `json:"job_id"`
	UploadID      int        `json:"upload_id"`
	UserID        *int       `json:"user_id,omitempty"` // Semantic reference to users.id
	Status        string     `json:"status"`            // queued, extracting_text, chunking, generating_embeddings, analyzing, completed, failed
	Progress      int        `json:"progress"`          // 0-100
	CurrentStep   string     `json:"current_step"`      // Human-readable description
	ExtractedText *string    `json:"extracted_text,omitempty"`
	ErrorMessage  *string    `json:"error_message,omitempty"`
	CreatedAt     time.Time  `json:"created_at"`
	UpdatedAt     time.Time  `json:"updated_at"`
	CompletedAt   *time.Time `json:"completed_at,omitempty"`
}

// UserProfile represents analyzed resume data
type UserProfile struct {
	ID                 int               `json:"id"`
	UploadID           int               `json:"upload_id"`
	JobID              string            `json:"job_id"`
	Name               *string           `json:"name,omitempty"`
	Email              *string           `json:"email,omitempty"`
	Phone              *string           `json:"phone,omitempty"`
	LinkedInURL        *string           `json:"linkedin_url,omitempty"`
	Age                *int              `json:"age,omitempty"`
	Race               *string           `json:"race,omitempty"`
	Location           *string           `json:"location,omitempty"`
	TotalWorkYears     *float64          `json:"total_work_years,omitempty"`
	Skills             map[string][]string `json:"skills,omitempty"`             // {"technical": [...], "soft": [...]}
	Experience         []ExperienceEntry   `json:"experience,omitempty"`
	Education          []EducationEntry    `json:"education,omitempty"`
	Summary            *string             `json:"summary,omitempty"`
	JobRecommendations []string            `json:"job_recommendations,omitempty"`
	Strengths          []string            `json:"strengths,omitempty"`
	Weaknesses         []string            `json:"weaknesses,omitempty"`
	CreatedAt          time.Time           `json:"created_at"`
	UpdatedAt          time.Time           `json:"updated_at"`
}

// ExperienceEntry represents a work experience entry
type ExperienceEntry struct {
	Company     string  `json:"company"`
	Role        string  `json:"role"`
	StartDate   *string `json:"start_date,omitempty"`
	EndDate     *string `json:"end_date,omitempty"`
	Years       float64 `json:"years"`
	Description string  `json:"description,omitempty"`
}

// EducationEntry represents an education entry
type EducationEntry struct {
	Degree      string `json:"degree"`
	Institution string `json:"institution"`
	Year        *int   `json:"year,omitempty"`
}

// AnalysisStatus represents the current status of an analysis job (for API responses)
type AnalysisStatus struct {
	JobID         string     `json:"job_id"`
	Status        string     `json:"status"`
	Progress      int        `json:"progress"`
	CurrentStep   string     `json:"current_step"`
	ExtractedText *string    `json:"extracted_text,omitempty"` // Text extracted from resume
	CreatedAt     time.Time  `json:"created_at"`
	UpdatedAt     time.Time  `json:"updated_at"`
	CompletedAt   *time.Time `json:"completed_at,omitempty"`
	ErrorMessage  *string    `json:"error_message,omitempty"`
}

// AnalysisResult represents the complete analysis result (for API responses)
type AnalysisResult struct {
	JobID              string              `json:"job_id"`
	Status             string              `json:"status"`
	UploadID           int                 `json:"upload_id"`
	Name               *string             `json:"name,omitempty"`
	Email              *string             `json:"email,omitempty"`
	Phone              *string             `json:"phone,omitempty"`
	LinkedInURL        *string             `json:"linkedin_url,omitempty"`
	Age                *int                `json:"age,omitempty"`
	Race               *string             `json:"race,omitempty"`
	Location           *string             `json:"location,omitempty"`
	TotalWorkYears     *float64            `json:"total_work_years,omitempty"`
	Skills             map[string][]string `json:"skills,omitempty"`
	Experience         []ExperienceEntry   `json:"experience,omitempty"`
	Education          []EducationEntry    `json:"education,omitempty"`
	Summary            *string             `json:"summary,omitempty"`
	JobRecommendations []string            `json:"job_recommendations,omitempty"`
	Strengths          []string            `json:"strengths,omitempty"`
	Weaknesses         []string            `json:"weaknesses,omitempty"`
	CreatedAt          time.Time           `json:"created_at"`
	CompletedAt        *time.Time          `json:"completed_at,omitempty"`
}
