package exporter

import (
	"context"
	"fmt"

	"github.com/your-org/websocket-server/pkg/models"
)

// DefaultExporter implements the Exporter interface
type DefaultExporter struct {
	jsonExporter *JSONExporter
	csvExporter  *CSVExporter
	pdfExporter  *PDFExporter
	docxExporter *DOCXExporter
}

// NewDefaultExporter creates a new default exporter with all formats
func NewDefaultExporter() Exporter {
	return &DefaultExporter{
		jsonExporter: NewJSONExporter(),
		csvExporter:  NewCSVExporter(),
		pdfExporter:  NewPDFExporter(),
		docxExporter: NewDOCXExporter(),
	}
}

// Export converts a UserProfile to the specified format
func (e *DefaultExporter) Export(ctx context.Context, profile *models.UserProfile, format Format) ([]byte, error) {
	switch format {
	case FormatJSON:
		return e.jsonExporter.ExportJSON(ctx, profile)
	case FormatCSV:
		return e.csvExporter.ExportCSV(ctx, profile)
	case FormatPDF:
		return e.pdfExporter.ExportPDF(ctx, profile)
	case FormatDOCX:
		return e.docxExporter.ExportDOCX(ctx, profile)
	default:
		return nil, fmt.Errorf("unsupported export format: %s", format)
	}
}

// GetContentType returns the MIME type for the given format
func (e *DefaultExporter) GetContentType(format Format) string {
	switch format {
	case FormatJSON:
		return "application/json"
	case FormatCSV:
		return "text/csv"
	case FormatPDF:
		return "application/pdf"
	case FormatDOCX:
		return "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
	default:
		return "application/octet-stream"
	}
}

// GetFileExtension returns the file extension for the given format
func (e *DefaultExporter) GetFileExtension(format Format) string {
	switch format {
	case FormatJSON:
		return ".json"
	case FormatCSV:
		return ".csv"
	case FormatPDF:
		return ".pdf"
	case FormatDOCX:
		return ".docx"
	default:
		return ".bin"
	}
}
