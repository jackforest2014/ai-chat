package exporter

import (
	"bytes"
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/nguyenthenguyen/docx"
	"github.com/your-org/websocket-server/pkg/models"
)

// DOCXExporter exports profile data as DOCX
type DOCXExporter struct{}

// NewDOCXExporter creates a new DOCX exporter
func NewDOCXExporter() *DOCXExporter {
	return &DOCXExporter{}
}

// ExportDOCX exports a UserProfile to DOCX format
func (e *DOCXExporter) ExportDOCX(ctx context.Context, profile *models.UserProfile) ([]byte, error) {
	// Create a new document
	doc := docx.NewFile()

	// Title
	doc.AddHeading("Resume Analysis Report", 1)

	// Personal Information
	e.addPersonalInfo(doc, profile)

	// Professional Summary
	if profile.Summary != nil && *profile.Summary != "" {
		doc.AddHeading("Professional Summary", 2)
		doc.AddParagraph(*profile.Summary)
	}

	// Skills
	if profile.Skills != nil && len(profile.Skills) > 0 {
		doc.AddHeading("Skills", 2)
		e.addSkillsTable(doc, profile.Skills)
	}

	// Work Experience
	if len(profile.Experience) > 0 {
		doc.AddHeading("Work Experience", 2)
		e.addExperienceList(doc, profile.Experience)
	}

	// Education
	if len(profile.Education) > 0 {
		doc.AddHeading("Education", 2)
		e.addEducationList(doc, profile.Education)
	}

	// AI Analysis
	if len(profile.Strengths) > 0 || len(profile.Weaknesses) > 0 || len(profile.JobRecommendations) > 0 {
		doc.AddHeading("AI Analysis", 2)
		e.addAIAnalysis(doc, profile.Strengths, profile.Weaknesses, profile.JobRecommendations)
	}

	// Footer metadata
	e.addMetadata(doc, profile.JobID)

	// Write to buffer
	var buf bytes.Buffer
	err := doc.Write(&buf)
	if err != nil {
		return nil, fmt.Errorf("failed to generate DOCX: %w", err)
	}

	return buf.Bytes(), nil
}

// addPersonalInfo adds personal information section
func (e *DOCXExporter) addPersonalInfo(doc *docx.Document, profile *models.UserProfile) {
	if profile.Name != nil {
		doc.AddParagraph(fmt.Sprintf("Name: %s", *profile.Name))
	}
	if profile.Email != nil {
		doc.AddParagraph(fmt.Sprintf("Email: %s", *profile.Email))
	}
	if profile.Phone != nil {
		doc.AddParagraph(fmt.Sprintf("Phone: %s", *profile.Phone))
	}
	if profile.Location != nil {
		doc.AddParagraph(fmt.Sprintf("Location: %s", *profile.Location))
	}
	if profile.LinkedInURL != nil {
		doc.AddParagraph(fmt.Sprintf("LinkedIn: %s", *profile.LinkedInURL))
	}
	if profile.TotalWorkYears != nil {
		doc.AddParagraph(fmt.Sprintf("Total Work Experience: %.1f years", *profile.TotalWorkYears))
	}
}

// addSkillsTable adds skills in a table format
func (e *DOCXExporter) addSkillsTable(doc *docx.Document, skills map[string][]string) {
	// Note: docx library has limited table support, so we'll use formatted text
	for category, skillList := range skills {
		skillText := fmt.Sprintf("%s: %s", category, strings.Join(skillList, ", "))
		doc.AddParagraph(skillText)
	}
}

// addExperienceList adds work experience as bullet lists
func (e *DOCXExporter) addExperienceList(doc *docx.Document, experiences []models.ExperienceEntry) {
	for _, exp := range experiences {
		// Job title and company
		jobTitle := ""
		if exp.Role != nil {
			jobTitle = *exp.Role
		}
		if exp.Company != nil {
			if jobTitle != "" {
				jobTitle += " at "
			}
			jobTitle += *exp.Company
		}
		if exp.Years != nil {
			jobTitle += fmt.Sprintf(" (%.1f years)", *exp.Years)
		}

		doc.AddParagraph(jobTitle)

		// Description as indented paragraph
		if exp.Description != nil && *exp.Description != "" {
			doc.AddParagraph("  • " + *exp.Description)
		}
	}
}

// addEducationList adds education entries
func (e *DOCXExporter) addEducationList(doc *docx.Document, education []models.EducationEntry) {
	for _, edu := range education {
		eduText := ""
		if edu.Degree != nil {
			eduText = *edu.Degree
		}
		if edu.Institution != nil {
			if eduText != "" {
				eduText += " - "
			}
			eduText += *edu.Institution
		}
		if edu.Year != nil {
			eduText += fmt.Sprintf(" (%d)", *edu.Year)
		}
		doc.AddParagraph(eduText)
	}
}

// addAIAnalysis adds AI-generated analysis
func (e *DOCXExporter) addAIAnalysis(doc *docx.Document, strengths, weaknesses, recommendations []string) {
	// Strengths
	if len(strengths) > 0 {
		doc.AddHeading("Strengths", 3)
		for _, strength := range strengths {
			doc.AddParagraph("• " + strength)
		}
	}

	// Areas for Growth
	if len(weaknesses) > 0 {
		doc.AddHeading("Areas for Growth", 3)
		for _, weakness := range weaknesses {
			doc.AddParagraph("• " + weakness)
		}
	}

	// Recommended Roles
	if len(recommendations) > 0 {
		doc.AddHeading("Recommended Roles", 3)
		for _, rec := range recommendations {
			doc.AddParagraph("• " + rec)
		}
	}
}

// addMetadata adds document metadata
func (e *DOCXExporter) addMetadata(doc *docx.Document, jobID string) {
	doc.AddParagraph("") // Empty line
	metadataText := fmt.Sprintf("Generated: %s | Job ID: %s",
		time.Now().UTC().Format("2006-01-02 15:04:05 UTC"),
		jobID)
	doc.AddParagraph(metadataText)
}
