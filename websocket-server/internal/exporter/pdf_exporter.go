package exporter

import (
	"bytes"
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/jung-kurt/gofpdf"
	"github.com/your-org/websocket-server/pkg/models"
)

// PDFExporter exports profile data as PDF
type PDFExporter struct{}

// NewPDFExporter creates a new PDF exporter
func NewPDFExporter() *PDFExporter {
	return &PDFExporter{}
}

// ExportPDF exports a UserProfile to PDF format
func (e *PDFExporter) ExportPDF(ctx context.Context, profile *models.UserProfile) ([]byte, error) {
	pdf := gofpdf.New("P", "mm", "A4", "")
	pdf.AddPage()

	// Set up fonts
	pdf.SetFont("Arial", "B", 18)

	// Header
	e.addHeader(pdf, profile)

	// Professional Summary
	if profile.Summary != nil && *profile.Summary != "" {
		e.addSection(pdf, "Professional Summary")
		pdf.SetFont("Arial", "", 11)
		pdf.MultiCell(0, 5, *profile.Summary, "", "", false)
		pdf.Ln(5)
	}

	// Skills
	if profile.Skills != nil && len(profile.Skills) > 0 {
		e.addSection(pdf, "Skills")
		e.addSkills(pdf, profile.Skills)
		pdf.Ln(5)
	}

	// Work Experience
	if len(profile.Experience) > 0 {
		e.addSection(pdf, "Work Experience")
		e.addExperience(pdf, profile.Experience)
		pdf.Ln(5)
	}

	// Education
	if len(profile.Education) > 0 {
		e.addSection(pdf, "Education")
		e.addEducation(pdf, profile.Education)
		pdf.Ln(5)
	}

	// AI Analysis
	if len(profile.Strengths) > 0 || len(profile.Weaknesses) > 0 || len(profile.JobRecommendations) > 0 {
		e.addSection(pdf, "AI Analysis")
		e.addAIAnalysis(pdf, profile.Strengths, profile.Weaknesses, profile.JobRecommendations)
	}

	// Footer
	e.addFooter(pdf, profile.JobID)

	// Output to buffer
	var buf bytes.Buffer
	err := pdf.Output(&buf)
	if err != nil {
		return nil, fmt.Errorf("failed to generate PDF: %w", err)
	}

	return buf.Bytes(), nil
}

// addHeader adds the document header with personal info
func (e *PDFExporter) addHeader(pdf *gofpdf.Fpdf, profile *models.UserProfile) {
	// Title
	pdf.SetFont("Arial", "B", 18)
	pdf.SetTextColor(26, 54, 93) // Dark blue
	pdf.Cell(0, 10, "Resume Analysis Report")
	pdf.Ln(10)

	// Personal Information
	pdf.SetFont("Arial", "B", 14)
	pdf.SetTextColor(0, 0, 0)
	if profile.Name != nil {
		pdf.Cell(0, 7, *profile.Name)
		pdf.Ln(7)
	}

	pdf.SetFont("Arial", "", 11)
	pdf.SetTextColor(60, 60, 60)

	contactInfo := []string{}
	if profile.Email != nil {
		contactInfo = append(contactInfo, *profile.Email)
	}
	if profile.Phone != nil {
		contactInfo = append(contactInfo, *profile.Phone)
	}
	if len(contactInfo) > 0 {
		pdf.Cell(0, 5, strings.Join(contactInfo, " | "))
		pdf.Ln(5)
	}

	locationInfo := []string{}
	if profile.Location != nil {
		locationInfo = append(locationInfo, *profile.Location)
	}
	if profile.LinkedInURL != nil {
		locationInfo = append(locationInfo, *profile.LinkedInURL)
	}
	if len(locationInfo) > 0 {
		pdf.Cell(0, 5, strings.Join(locationInfo, " | "))
		pdf.Ln(5)
	}

	pdf.Ln(3)
	pdf.SetTextColor(0, 0, 0)
}

// addSection adds a section header
func (e *PDFExporter) addSection(pdf *gofpdf.Fpdf, title string) {
	pdf.SetFont("Arial", "B", 14)
	pdf.SetTextColor(37, 99, 235) // Medium blue
	pdf.Cell(0, 7, title)
	pdf.Ln(7)

	// Underline
	pdf.SetDrawColor(226, 232, 240) // Light gray
	pdf.SetLineWidth(0.5)
	x, y := pdf.GetXY()
	pdf.Line(x, y, x+190, y)
	pdf.Ln(3)

	pdf.SetTextColor(0, 0, 0)
}

// addSkills adds skills section with categories
func (e *PDFExporter) addSkills(pdf *gofpdf.Fpdf, skills map[string][]string) {
	pdf.SetFont("Arial", "", 11)

	for category, skillList := range skills {
		// Category name in bold
		pdf.SetFont("Arial", "B", 11)
		pdf.Cell(35, 5, category+":")

		// Skills separated by bullets
		pdf.SetFont("Arial", "", 11)
		skillText := strings.Join(skillList, " • ")
		pdf.MultiCell(0, 5, skillText, "", "", false)
		pdf.Ln(2)
	}
}

// addExperience adds work experience entries
func (e *PDFExporter) addExperience(pdf *gofpdf.Fpdf, experiences []models.ExperienceEntry) {
	for i, exp := range experiences {
		// Job title and company
		pdf.SetFont("Arial", "B", 11)
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
		pdf.Cell(0, 6, jobTitle)
		pdf.Ln(6)

		// Description
		if exp.Description != nil && *exp.Description != "" {
			pdf.SetFont("Arial", "", 10)
			pdf.MultiCell(0, 5, "• "+*exp.Description, "", "", false)
		}

		// Add spacing between entries
		if i < len(experiences)-1 {
			pdf.Ln(3)
		}
	}
}

// addEducation adds education entries
func (e *PDFExporter) addEducation(pdf *gofpdf.Fpdf, education []models.EducationEntry) {
	for _, edu := range education {
		pdf.SetFont("Arial", "B", 11)
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
		pdf.Cell(0, 6, eduText)
		pdf.Ln(6)
	}
}

// addAIAnalysis adds AI-generated analysis section
func (e *PDFExporter) addAIAnalysis(pdf *gofpdf.Fpdf, strengths, weaknesses, recommendations []string) {
	// Strengths
	if len(strengths) > 0 {
		pdf.SetFont("Arial", "B", 12)
		pdf.Cell(0, 6, "Strengths:")
		pdf.Ln(6)

		pdf.SetFont("Arial", "", 10)
		for _, strength := range strengths {
			pdf.MultiCell(0, 5, "• "+strength, "", "", false)
		}
		pdf.Ln(3)
	}

	// Weaknesses / Areas for Growth
	if len(weaknesses) > 0 {
		pdf.SetFont("Arial", "B", 12)
		pdf.Cell(0, 6, "Areas for Growth:")
		pdf.Ln(6)

		pdf.SetFont("Arial", "", 10)
		for _, weakness := range weaknesses {
			pdf.MultiCell(0, 5, "• "+weakness, "", "", false)
		}
		pdf.Ln(3)
	}

	// Recommended Roles
	if len(recommendations) > 0 {
		pdf.SetFont("Arial", "B", 12)
		pdf.Cell(0, 6, "Recommended Roles:")
		pdf.Ln(6)

		pdf.SetFont("Arial", "", 10)
		for _, rec := range recommendations {
			pdf.MultiCell(0, 5, "• "+rec, "", "", false)
		}
	}
}

// addFooter adds document footer with metadata
func (e *PDFExporter) addFooter(pdf *gofpdf.Fpdf, jobID string) {
	// Move to bottom
	pdf.SetY(-15)

	pdf.SetFont("Arial", "I", 9)
	pdf.SetTextColor(128, 128, 128)

	footerText := fmt.Sprintf("Generated: %s | Job ID: %s",
		time.Now().UTC().Format("2006-01-02 15:04:05 UTC"),
		jobID)

	pdf.Cell(0, 10, footerText)
}
