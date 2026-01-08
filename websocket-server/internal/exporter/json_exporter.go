package exporter

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/your-org/websocket-server/pkg/models"
)

// JSONExporter exports profile data as JSON
type JSONExporter struct{}

// NewJSONExporter creates a new JSON exporter
func NewJSONExporter() *JSONExporter {
	return &JSONExporter{}
}

// ExportedProfile represents the JSON structure for export
type ExportedProfile struct {
	JobID              string                   `json:"job_id"`
	PersonalInfo       PersonalInfo             `json:"personal_info"`
	Skills             map[string][]string      `json:"skills"`
	Experience         []models.ExperienceEntry `json:"experience"`
	Education          []models.EducationEntry  `json:"education"`
	Summary            *string                  `json:"summary"`
	JobRecommendations []string                 `json:"job_recommendations"`
	Strengths          []string                 `json:"strengths"`
	Weaknesses         []string                 `json:"weaknesses"`
	ExportedAt         string                   `json:"exported_at"`
}

// PersonalInfo contains personal information
type PersonalInfo struct {
	Name           *string  `json:"name"`
	Email          *string  `json:"email"`
	Phone          *string  `json:"phone"`
	LinkedInURL    *string  `json:"linkedin_url"`
	Age            *int     `json:"age"`
	Race           *string  `json:"race"`
	Location       *string  `json:"location"`
	TotalWorkYears *float64 `json:"total_work_years"`
}

// ExportJSON exports a UserProfile to JSON format
func (e *JSONExporter) ExportJSON(ctx context.Context, profile *models.UserProfile) ([]byte, error) {
	exported := ExportedProfile{
		JobID: profile.JobID,
		PersonalInfo: PersonalInfo{
			Name:           profile.Name,
			Email:          profile.Email,
			Phone:          profile.Phone,
			LinkedInURL:    profile.LinkedInURL,
			Age:            profile.Age,
			Race:           profile.Race,
			Location:       profile.Location,
			TotalWorkYears: profile.TotalWorkYears,
		},
		Skills:             profile.Skills,
		Experience:         profile.Experience,
		Education:          profile.Education,
		Summary:            profile.Summary,
		JobRecommendations: profile.JobRecommendations,
		Strengths:          profile.Strengths,
		Weaknesses:         profile.Weaknesses,
		ExportedAt:         time.Now().UTC().Format(time.RFC3339),
	}

	data, err := json.MarshalIndent(exported, "", "  ")
	if err != nil {
		return nil, fmt.Errorf("failed to marshal JSON: %w", err)
	}

	return data, nil
}
