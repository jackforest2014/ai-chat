package exporter

import (
	"bytes"
	"context"
	"encoding/csv"
	"fmt"
	"strings"
	"time"

	"github.com/your-org/websocket-server/pkg/models"
)

// CSVExporter exports profile data as CSV
type CSVExporter struct{}

// NewCSVExporter creates a new CSV exporter
func NewCSVExporter() *CSVExporter {
	return &CSVExporter{}
}

// ExportCSV exports a UserProfile to CSV format
// The CSV is structured with sections for different data types
func (e *CSVExporter) ExportCSV(ctx context.Context, profile *models.UserProfile) ([]byte, error) {
	var buf bytes.Buffer
	writer := csv.NewWriter(&buf)

	// Helper function to write a section header
	writeSection := func(title string) error {
		return writer.Write([]string{title})
	}

	// Helper to write key-value pairs
	writeKeyValue := func(key, value string) error {
		return writer.Write([]string{key, value})
	}

	// Personal Information Section
	if err := writeSection("PERSONAL INFORMATION"); err != nil {
		return nil, err
	}
	writer.Write([]string{}) // Empty row

	if profile.Name != nil {
		writeKeyValue("Name", *profile.Name)
	}
	if profile.Email != nil {
		writeKeyValue("Email", *profile.Email)
	}
	if profile.Phone != nil {
		writeKeyValue("Phone", *profile.Phone)
	}
	if profile.LinkedInURL != nil {
		writeKeyValue("LinkedIn", *profile.LinkedInURL)
	}
	if profile.Age != nil {
		writeKeyValue("Age", fmt.Sprintf("%d", *profile.Age))
	}
	if profile.Race != nil {
		writeKeyValue("Race", *profile.Race)
	}
	if profile.Location != nil {
		writeKeyValue("Location", *profile.Location)
	}
	if profile.TotalWorkYears != nil {
		writeKeyValue("Total Work Years", fmt.Sprintf("%.1f", *profile.TotalWorkYears))
	}

	writer.Write([]string{}) // Empty row
	writer.Write([]string{}) // Empty row

	// Skills Section
	if err := writeSection("SKILLS"); err != nil {
		return nil, err
	}
	writer.Write([]string{}) // Empty row
	writer.Write([]string{"Category", "Skills"})

	if profile.Skills != nil {
		for category, skillList := range profile.Skills {
			writer.Write([]string{category, strings.Join(skillList, ", ")})
		}
	}

	writer.Write([]string{}) // Empty row
	writer.Write([]string{}) // Empty row

	// Experience Section
	if err := writeSection("WORK EXPERIENCE"); err != nil {
		return nil, err
	}
	writer.Write([]string{}) // Empty row
	writer.Write([]string{"Company", "Role", "Years", "Description"})

	for _, exp := range profile.Experience {
		years := ""
		if exp.Years != nil {
			years = fmt.Sprintf("%.1f", *exp.Years)
		}
		description := ""
		if exp.Description != nil {
			description = *exp.Description
		}
		writer.Write([]string{
			stringOrEmpty(exp.Company),
			stringOrEmpty(exp.Role),
			years,
			description,
		})
	}

	writer.Write([]string{}) // Empty row
	writer.Write([]string{}) // Empty row

	// Education Section
	if err := writeSection("EDUCATION"); err != nil {
		return nil, err
	}
	writer.Write([]string{}) // Empty row
	writer.Write([]string{"Degree", "Institution", "Year"})

	for _, edu := range profile.Education {
		year := ""
		if edu.Year != nil {
			year = fmt.Sprintf("%d", *edu.Year)
		}
		writer.Write([]string{
			stringOrEmpty(edu.Degree),
			stringOrEmpty(edu.Institution),
			year,
		})
	}

	writer.Write([]string{}) // Empty row
	writer.Write([]string{}) // Empty row

	// Summary Section
	if profile.Summary != nil && *profile.Summary != "" {
		if err := writeSection("SUMMARY"); err != nil {
			return nil, err
		}
		writer.Write([]string{}) // Empty row
		writer.Write([]string{*profile.Summary})
		writer.Write([]string{}) // Empty row
		writer.Write([]string{}) // Empty row
	}

	// Job Recommendations Section
	if len(profile.JobRecommendations) > 0 {
		if err := writeSection("JOB RECOMMENDATIONS"); err != nil {
			return nil, err
		}
		writer.Write([]string{}) // Empty row
		for i, rec := range profile.JobRecommendations {
			writer.Write([]string{fmt.Sprintf("%d.", i+1), rec})
		}
		writer.Write([]string{}) // Empty row
		writer.Write([]string{}) // Empty row
	}

	// Strengths Section
	if len(profile.Strengths) > 0 {
		if err := writeSection("STRENGTHS"); err != nil {
			return nil, err
		}
		writer.Write([]string{}) // Empty row
		for i, strength := range profile.Strengths {
			writer.Write([]string{fmt.Sprintf("%d.", i+1), strength})
		}
		writer.Write([]string{}) // Empty row
		writer.Write([]string{}) // Empty row
	}

	// Weaknesses Section
	if len(profile.Weaknesses) > 0 {
		if err := writeSection("WEAKNESSES"); err != nil {
			return nil, err
		}
		writer.Write([]string{}) // Empty row
		for i, weakness := range profile.Weaknesses {
			writer.Write([]string{fmt.Sprintf("%d.", i+1), weakness})
		}
		writer.Write([]string{}) // Empty row
		writer.Write([]string{}) // Empty row
	}

	// Export Metadata
	if err := writeSection("EXPORT METADATA"); err != nil {
		return nil, err
	}
	writer.Write([]string{}) // Empty row
	writeKeyValue("Job ID", profile.JobID)
	writeKeyValue("Exported At", time.Now().UTC().Format(time.RFC3339))

	writer.Flush()

	if err := writer.Error(); err != nil {
		return nil, fmt.Errorf("failed to write CSV: %w", err)
	}

	return buf.Bytes(), nil
}

// stringOrEmpty returns the string value or empty string if nil
func stringOrEmpty(s *string) string {
	if s == nil {
		return ""
	}
	return *s
}
