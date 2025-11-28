package postgres

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"

	"github.com/your-org/websocket-server/internal/repository"
	"github.com/your-org/websocket-server/pkg/models"
)

// AnalysisPostgresRepository implements AnalysisRepository for PostgreSQL
type AnalysisPostgresRepository struct {
	db *sql.DB
}

// NewAnalysisRepository creates a new PostgreSQL analysis repository
func NewAnalysisRepository(db *sql.DB) repository.AnalysisRepository {
	return &AnalysisPostgresRepository{db: db}
}

// CreateJob creates a new analysis job
func (r *AnalysisPostgresRepository) CreateJob(ctx context.Context, job *models.AnalysisJob) error {
	query := `
		INSERT INTO analysis_jobs (job_id, upload_id, user_id, status, progress, current_step)
		VALUES ($1, $2, $3, $4, $5, $6)
		RETURNING id, created_at, updated_at
	`

	err := r.db.QueryRowContext(
		ctx,
		query,
		job.JobID,
		job.UploadID,
		job.UserID,
		job.Status,
		job.Progress,
		job.CurrentStep,
	).Scan(&job.ID, &job.CreatedAt, &job.UpdatedAt)

	if err != nil {
		return fmt.Errorf("failed to create analysis job: %w", err)
	}

	return nil
}

// GetJobByID retrieves an analysis job by job ID
func (r *AnalysisPostgresRepository) GetJobByID(ctx context.Context, jobID string) (*models.AnalysisJob, error) {
	query := `
		SELECT id, job_id, upload_id, user_id, status, progress, current_step,
		       extracted_text, error_message, created_at, updated_at, completed_at
		FROM analysis_jobs
		WHERE job_id = $1
	`

	job := &models.AnalysisJob{}
	err := r.db.QueryRowContext(ctx, query, jobID).Scan(
		&job.ID,
		&job.JobID,
		&job.UploadID,
		&job.UserID,
		&job.Status,
		&job.Progress,
		&job.CurrentStep,
		&job.ExtractedText,
		&job.ErrorMessage,
		&job.CreatedAt,
		&job.UpdatedAt,
		&job.CompletedAt,
	)

	if err == sql.ErrNoRows {
		return nil, fmt.Errorf("job not found: %s", jobID)
	}
	if err != nil {
		return nil, fmt.Errorf("failed to get job: %w", err)
	}

	return job, nil
}

// GetJobsByUserID retrieves all analysis jobs for a specific user
func (r *AnalysisPostgresRepository) GetJobsByUserID(ctx context.Context, userID int) ([]*models.AnalysisJob, error) {
	query := `
		SELECT id, job_id, upload_id, user_id, status, progress, current_step,
		       extracted_text, error_message, created_at, updated_at, completed_at
		FROM analysis_jobs
		WHERE user_id = $1
		ORDER BY created_at DESC
	`

	rows, err := r.db.QueryContext(ctx, query, userID)
	if err != nil {
		return nil, fmt.Errorf("failed to get jobs by user: %w", err)
	}
	defer rows.Close()

	var jobs []*models.AnalysisJob
	for rows.Next() {
		job := &models.AnalysisJob{}
		err := rows.Scan(
			&job.ID,
			&job.JobID,
			&job.UploadID,
			&job.UserID,
			&job.Status,
			&job.Progress,
			&job.CurrentStep,
			&job.ExtractedText,
			&job.ErrorMessage,
			&job.CreatedAt,
			&job.UpdatedAt,
			&job.CompletedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan job: %w", err)
		}
		jobs = append(jobs, job)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("rows iteration error: %w", err)
	}

	return jobs, nil
}

// GetJobsByUploadID retrieves all analysis jobs for a specific upload
func (r *AnalysisPostgresRepository) GetJobsByUploadID(ctx context.Context, uploadID int) ([]*models.AnalysisJob, error) {
	query := `
		SELECT id, job_id, upload_id, user_id, status, progress, current_step,
		       extracted_text, error_message, created_at, updated_at, completed_at
		FROM analysis_jobs
		WHERE upload_id = $1
		ORDER BY created_at DESC
	`

	rows, err := r.db.QueryContext(ctx, query, uploadID)
	if err != nil {
		return nil, fmt.Errorf("failed to get jobs by upload: %w", err)
	}
	defer rows.Close()

	var jobs []*models.AnalysisJob
	for rows.Next() {
		job := &models.AnalysisJob{}
		err := rows.Scan(
			&job.ID,
			&job.JobID,
			&job.UploadID,
			&job.UserID,
			&job.Status,
			&job.Progress,
			&job.CurrentStep,
			&job.ExtractedText,
			&job.ErrorMessage,
			&job.CreatedAt,
			&job.UpdatedAt,
			&job.CompletedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan job: %w", err)
		}
		jobs = append(jobs, job)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("rows iteration error: %w", err)
	}

	return jobs, nil
}

// UpdateExtractedText updates the extracted text for a job
func (r *AnalysisPostgresRepository) UpdateExtractedText(ctx context.Context, jobID string, extractedText string) error {
	query := `
		UPDATE analysis_jobs
		SET extracted_text = $1, updated_at = CURRENT_TIMESTAMP
		WHERE job_id = $2
	`

	result, err := r.db.ExecContext(ctx, query, extractedText, jobID)
	if err != nil {
		return fmt.Errorf("failed to update extracted text: %w", err)
	}

	rows, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to get rows affected: %w", err)
	}

	if rows == 0 {
		return fmt.Errorf("job not found: %s", jobID)
	}

	return nil
}

// UpdateJobStatus updates the status, progress, and current step of a job
func (r *AnalysisPostgresRepository) UpdateJobStatus(ctx context.Context, jobID string, status string, progress int, currentStep string) error {
	query := `
		UPDATE analysis_jobs
		SET status = $1, progress = $2, current_step = $3, updated_at = CURRENT_TIMESTAMP
		WHERE job_id = $4
	`

	result, err := r.db.ExecContext(ctx, query, status, progress, currentStep, jobID)
	if err != nil {
		return fmt.Errorf("failed to update job status: %w", err)
	}

	rows, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to get rows affected: %w", err)
	}

	if rows == 0 {
		return fmt.Errorf("job not found: %s", jobID)
	}

	return nil
}

// UpdateJobError updates the job with an error message and sets status to failed
func (r *AnalysisPostgresRepository) UpdateJobError(ctx context.Context, jobID string, errorMessage string) error {
	query := `
		UPDATE analysis_jobs
		SET status = 'failed', error_message = $1, updated_at = CURRENT_TIMESTAMP,
		    completed_at = CURRENT_TIMESTAMP
		WHERE job_id = $2
	`

	result, err := r.db.ExecContext(ctx, query, errorMessage, jobID)
	if err != nil {
		return fmt.Errorf("failed to update job error: %w", err)
	}

	rows, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to get rows affected: %w", err)
	}

	if rows == 0 {
		return fmt.Errorf("job not found: %s", jobID)
	}

	return nil
}

// CompleteJob marks a job as completed
func (r *AnalysisPostgresRepository) CompleteJob(ctx context.Context, jobID string) error {
	query := `
		UPDATE analysis_jobs
		SET status = 'completed', progress = 100, updated_at = CURRENT_TIMESTAMP,
		    completed_at = CURRENT_TIMESTAMP
		WHERE job_id = $1
	`

	result, err := r.db.ExecContext(ctx, query, jobID)
	if err != nil {
		return fmt.Errorf("failed to complete job: %w", err)
	}

	rows, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to get rows affected: %w", err)
	}

	if rows == 0 {
		return fmt.Errorf("job not found: %s", jobID)
	}

	return nil
}

// CreateProfile creates a new user profile
func (r *AnalysisPostgresRepository) CreateProfile(ctx context.Context, profile *models.UserProfile) error {
	// Convert struct fields to JSONB
	skillsJSON, err := json.Marshal(profile.Skills)
	if err != nil {
		return fmt.Errorf("failed to marshal skills: %w", err)
	}

	experienceJSON, err := json.Marshal(profile.Experience)
	if err != nil {
		return fmt.Errorf("failed to marshal experience: %w", err)
	}

	educationJSON, err := json.Marshal(profile.Education)
	if err != nil {
		return fmt.Errorf("failed to marshal education: %w", err)
	}

	recommendationsJSON, err := json.Marshal(profile.JobRecommendations)
	if err != nil {
		return fmt.Errorf("failed to marshal job recommendations: %w", err)
	}

	strengthsJSON, err := json.Marshal(profile.Strengths)
	if err != nil {
		return fmt.Errorf("failed to marshal strengths: %w", err)
	}

	weaknessesJSON, err := json.Marshal(profile.Weaknesses)
	if err != nil {
		return fmt.Errorf("failed to marshal weaknesses: %w", err)
	}

	query := `
		INSERT INTO user_profile (
			upload_id, job_id, name, email, phone, linkedin_url,
			age, race, location, total_work_years,
			skills, experience, education, summary, job_recommendations,
			strengths, weaknesses
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
		RETURNING id, created_at, updated_at
	`

	err = r.db.QueryRowContext(
		ctx,
		query,
		profile.UploadID,
		profile.JobID,
		profile.Name,
		profile.Email,
		profile.Phone,
		profile.LinkedInURL,
		profile.Age,
		profile.Race,
		profile.Location,
		profile.TotalWorkYears,
		skillsJSON,
		experienceJSON,
		educationJSON,
		profile.Summary,
		recommendationsJSON,
		strengthsJSON,
		weaknessesJSON,
	).Scan(&profile.ID, &profile.CreatedAt, &profile.UpdatedAt)

	if err != nil {
		return fmt.Errorf("failed to create user profile: %w", err)
	}

	return nil
}

// GetProfileByJobID retrieves a user profile by job ID
func (r *AnalysisPostgresRepository) GetProfileByJobID(ctx context.Context, jobID string) (*models.UserProfile, error) {
	query := `
		SELECT id, upload_id, job_id, name, email, phone, linkedin_url,
		       age, race, location, total_work_years,
		       skills, experience, education, summary, job_recommendations,
		       strengths, weaknesses, created_at, updated_at
		FROM user_profile
		WHERE job_id = $1
	`

	profile := &models.UserProfile{}
	var skillsJSON, experienceJSON, educationJSON, recommendationsJSON, strengthsJSON, weaknessesJSON []byte

	err := r.db.QueryRowContext(ctx, query, jobID).Scan(
		&profile.ID,
		&profile.UploadID,
		&profile.JobID,
		&profile.Name,
		&profile.Email,
		&profile.Phone,
		&profile.LinkedInURL,
		&profile.Age,
		&profile.Race,
		&profile.Location,
		&profile.TotalWorkYears,
		&skillsJSON,
		&experienceJSON,
		&educationJSON,
		&profile.Summary,
		&recommendationsJSON,
		&strengthsJSON,
		&weaknessesJSON,
		&profile.CreatedAt,
		&profile.UpdatedAt,
	)

	if err == sql.ErrNoRows {
		return nil, fmt.Errorf("profile not found for job: %s", jobID)
	}
	if err != nil {
		return nil, fmt.Errorf("failed to get profile: %w", err)
	}

	// Unmarshal JSONB fields
	if err := json.Unmarshal(skillsJSON, &profile.Skills); err != nil {
		return nil, fmt.Errorf("failed to unmarshal skills: %w", err)
	}
	if err := json.Unmarshal(experienceJSON, &profile.Experience); err != nil {
		return nil, fmt.Errorf("failed to unmarshal experience: %w", err)
	}
	if err := json.Unmarshal(educationJSON, &profile.Education); err != nil {
		return nil, fmt.Errorf("failed to unmarshal education: %w", err)
	}
	if err := json.Unmarshal(recommendationsJSON, &profile.JobRecommendations); err != nil {
		return nil, fmt.Errorf("failed to unmarshal job recommendations: %w", err)
	}
	if err := json.Unmarshal(strengthsJSON, &profile.Strengths); err != nil {
		return nil, fmt.Errorf("failed to unmarshal strengths: %w", err)
	}
	if err := json.Unmarshal(weaknessesJSON, &profile.Weaknesses); err != nil {
		return nil, fmt.Errorf("failed to unmarshal weaknesses: %w", err)
	}

	return profile, nil
}

// GetProfileByUploadID retrieves a user profile by upload ID
func (r *AnalysisPostgresRepository) GetProfileByUploadID(ctx context.Context, uploadID int) (*models.UserProfile, error) {
	query := `
		SELECT id, upload_id, job_id, age, race, location, total_work_years,
		       skills, experience, education, summary, job_recommendations,
		       strengths, weaknesses, created_at, updated_at
		FROM user_profile
		WHERE upload_id = $1
		ORDER BY created_at DESC
		LIMIT 1
	`

	profile := &models.UserProfile{}
	var skillsJSON, experienceJSON, educationJSON, recommendationsJSON, strengthsJSON, weaknessesJSON []byte

	err := r.db.QueryRowContext(ctx, query, uploadID).Scan(
		&profile.ID,
		&profile.UploadID,
		&profile.JobID,
		&profile.Age,
		&profile.Race,
		&profile.Location,
		&profile.TotalWorkYears,
		&skillsJSON,
		&experienceJSON,
		&educationJSON,
		&profile.Summary,
		&recommendationsJSON,
		&strengthsJSON,
		&weaknessesJSON,
		&profile.CreatedAt,
		&profile.UpdatedAt,
	)

	if err == sql.ErrNoRows {
		return nil, fmt.Errorf("profile not found for upload: %d", uploadID)
	}
	if err != nil {
		return nil, fmt.Errorf("failed to get profile: %w", err)
	}

	// Unmarshal JSONB fields
	if err := json.Unmarshal(skillsJSON, &profile.Skills); err != nil {
		return nil, fmt.Errorf("failed to unmarshal skills: %w", err)
	}
	if err := json.Unmarshal(experienceJSON, &profile.Experience); err != nil {
		return nil, fmt.Errorf("failed to unmarshal experience: %w", err)
	}
	if err := json.Unmarshal(educationJSON, &profile.Education); err != nil {
		return nil, fmt.Errorf("failed to unmarshal education: %w", err)
	}
	if err := json.Unmarshal(recommendationsJSON, &profile.JobRecommendations); err != nil {
		return nil, fmt.Errorf("failed to unmarshal job recommendations: %w", err)
	}
	if err := json.Unmarshal(strengthsJSON, &profile.Strengths); err != nil {
		return nil, fmt.Errorf("failed to unmarshal strengths: %w", err)
	}
	if err := json.Unmarshal(weaknessesJSON, &profile.Weaknesses); err != nil {
		return nil, fmt.Errorf("failed to unmarshal weaknesses: %w", err)
	}

	return profile, nil
}

// UpdateProfile updates an existing user profile
func (r *AnalysisPostgresRepository) UpdateProfile(ctx context.Context, profile *models.UserProfile) error {
	// Convert struct fields to JSONB
	skillsJSON, err := json.Marshal(profile.Skills)
	if err != nil {
		return fmt.Errorf("failed to marshal skills: %w", err)
	}

	experienceJSON, err := json.Marshal(profile.Experience)
	if err != nil {
		return fmt.Errorf("failed to marshal experience: %w", err)
	}

	educationJSON, err := json.Marshal(profile.Education)
	if err != nil {
		return fmt.Errorf("failed to marshal education: %w", err)
	}

	recommendationsJSON, err := json.Marshal(profile.JobRecommendations)
	if err != nil {
		return fmt.Errorf("failed to marshal job recommendations: %w", err)
	}

	strengthsJSON, err := json.Marshal(profile.Strengths)
	if err != nil {
		return fmt.Errorf("failed to marshal strengths: %w", err)
	}

	weaknessesJSON, err := json.Marshal(profile.Weaknesses)
	if err != nil {
		return fmt.Errorf("failed to marshal weaknesses: %w", err)
	}

	query := `
		UPDATE user_profile
		SET age = $1, race = $2, location = $3, total_work_years = $4,
		    skills = $5, experience = $6, education = $7, summary = $8,
		    job_recommendations = $9, strengths = $10, weaknesses = $11,
		    updated_at = CURRENT_TIMESTAMP
		WHERE id = $12
	`

	result, err := r.db.ExecContext(
		ctx,
		query,
		profile.Age,
		profile.Race,
		profile.Location,
		profile.TotalWorkYears,
		skillsJSON,
		experienceJSON,
		educationJSON,
		profile.Summary,
		recommendationsJSON,
		strengthsJSON,
		weaknessesJSON,
		profile.ID,
	)

	if err != nil {
		return fmt.Errorf("failed to update profile: %w", err)
	}

	rows, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to get rows affected: %w", err)
	}

	if rows == 0 {
		return fmt.Errorf("profile not found: %d", profile.ID)
	}

	return nil
}

// DeleteJobsByUploadID deletes all analysis jobs for a specific upload
func (r *AnalysisPostgresRepository) DeleteJobsByUploadID(ctx context.Context, uploadID int) error {
	query := `DELETE FROM analysis_jobs WHERE upload_id = $1`

	_, err := r.db.ExecContext(ctx, query, uploadID)
	if err != nil {
		return fmt.Errorf("failed to delete jobs for upload %d: %w", uploadID, err)
	}

	return nil
}

// DeleteProfilesByUploadID deletes all user profiles for a specific upload
func (r *AnalysisPostgresRepository) DeleteProfilesByUploadID(ctx context.Context, uploadID int) error {
	query := `DELETE FROM user_profile WHERE upload_id = $1`

	_, err := r.db.ExecContext(ctx, query, uploadID)
	if err != nil {
		return fmt.Errorf("failed to delete profiles for upload %d: %w", uploadID, err)
	}

	return nil
}

// DeleteJob deletes a single analysis job and its associated profile by job_id
func (r *AnalysisPostgresRepository) DeleteJob(ctx context.Context, jobID string) error {
	// First delete the associated profile (if any)
	profileQuery := `DELETE FROM user_profile WHERE job_id = $1`
	_, err := r.db.ExecContext(ctx, profileQuery, jobID)
	if err != nil {
		return fmt.Errorf("failed to delete profile for job %s: %w", jobID, err)
	}

	// Then delete the job itself
	jobQuery := `DELETE FROM analysis_jobs WHERE job_id = $1`
	result, err := r.db.ExecContext(ctx, jobQuery, jobID)
	if err != nil {
		return fmt.Errorf("failed to delete job %s: %w", jobID, err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to get rows affected: %w", err)
	}

	if rowsAffected == 0 {
		return fmt.Errorf("job not found: %s", jobID)
	}

	return nil
}
