package models

import "time"

// Upload represents a user file upload with optional LinkedIn profile link
type Upload struct {
	ID          int       `json:"id"`
	UserID      *int      `json:"user_id,omitempty"`      // Reference to authenticated user
	LinkedinURL *string   `json:"linkedin_url,omitempty"` // Pointer to allow null
	FileName    string    `json:"file_name"`
	FileContent []byte    `json:"-"` // Excluded from JSON responses for security
	FileSize    int       `json:"file_size"`
	MimeType    string    `json:"mime_type"`
	JobID       *string   `json:"job_id,omitempty"` // Optional job ID from analysis_jobs
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

// UploadRequest represents the data received from client upload request
type UploadRequest struct {
	UserID      *int    `json:"user_id,omitempty"`
	LinkedinURL *string `json:"linkedin_url,omitempty"`
	FileName    string  `json:"file_name" validate:"required"`
	FileContent []byte  `json:"file_content" validate:"required"`
	MimeType    string  `json:"mime_type" validate:"required"`
}

// UploadResponse represents the response sent to client after successful upload
type UploadResponse struct {
	ID          int       `json:"id"`
	LinkedinURL *string   `json:"linkedin_url,omitempty"`
	FileName    string    `json:"file_name"`
	FileSize    int       `json:"file_size"`
	MimeType    string    `json:"mime_type"`
	CreatedAt   time.Time `json:"created_at"`
	Message     string    `json:"message"`
}
