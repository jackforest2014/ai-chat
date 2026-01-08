package exporter

import (
	"context"

	"github.com/your-org/websocket-server/pkg/models"
)

// Format represents the export format type
type Format string

const (
	FormatJSON Format = "json"
	FormatCSV  Format = "csv"
	FormatPDF  Format = "pdf"
	FormatDOCX Format = "docx"
)

// Exporter is the main interface for exporting analysis results
type Exporter interface {
	// Export converts a UserProfile to the specified format
	Export(ctx context.Context, profile *models.UserProfile, format Format) ([]byte, error)

	// GetContentType returns the MIME type for the given format
	GetContentType(format Format) string

	// GetFileExtension returns the file extension for the given format
	GetFileExtension(format Format) string
}

// ExportRequest contains parameters for an export operation
type ExportRequest struct {
	JobID  string
	Format Format
}

// ExportResponse contains the exported data and metadata
type ExportResponse struct {
	Data        []byte
	ContentType string
	FileName    string
}
