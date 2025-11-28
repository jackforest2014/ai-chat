package analyzer

import (
	"bytes"
	"context"
	"fmt"
	"os"
	"path/filepath"
	"strings"

	dslipakpdf "github.com/dslipak/pdf"
	ledongpdf "github.com/ledongthuc/pdf"
	"github.com/nguyenthenguyen/docx"
	pdfcpuapi "github.com/pdfcpu/pdfcpu/pkg/api"
	"github.com/unidoc/unipdf/v3/common"
	"github.com/unidoc/unipdf/v3/extractor"
	unipdf "github.com/unidoc/unipdf/v3/model"
)

// DefaultTextExtractor implements TextExtractor interface
type DefaultTextExtractor struct{}

// NewTextExtractor creates a new text extractor instance
func NewTextExtractor() TextExtractor {
	return &DefaultTextExtractor{}
}

// ExtractText extracts text from a file based on its MIME type
func (e *DefaultTextExtractor) ExtractText(ctx context.Context, fileContent []byte, mimeType string) (string, error) {
	// Validate file content
	if len(fileContent) == 0 {
		return "", fmt.Errorf("file content is empty")
	}

	// Log file details for debugging
	fmt.Printf("[DEBUG] File size: %d bytes, MIME type: %s, First 20 bytes: %v\n",
		len(fileContent), mimeType, fileContent[:min(20, len(fileContent))])

	// Check actual file signature regardless of MIME type
	actualType := detectFileType(fileContent)
	fmt.Printf("[DEBUG] Detected file type from signature: %s\n", actualType)

	// Create a channel for the extraction result
	type extractResult struct {
		text string
		err  error
	}
	resultChan := make(chan extractResult, 1)

	// Run extraction in a goroutine so we can timeout it
	go func() {
		var text string
		var err error

		switch mimeType {
		case "application/pdf":
			// Verify PDF signature
			if !isPDF(fileContent) {
				err = fmt.Errorf("file is not a valid PDF (MIME type says PDF but signature is %s)", actualType)
			} else {
				text, err = e.extractFromPDF(fileContent)
			}
		case "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
			text, err = e.extractFromDOCX(fileContent)
		default:
			err = fmt.Errorf("unsupported MIME type: %s", mimeType)
		}

		resultChan <- extractResult{text: text, err: err}
	}()

	// Wait for either the result or context cancellation
	select {
	case result := <-resultChan:
		return result.text, result.err
	case <-ctx.Done():
		return "", fmt.Errorf("text extraction timed out or was cancelled: %w", ctx.Err())
	}
}

// Helper function to get minimum of two integers
func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}

// detectFileType detects the actual file type from file signature
func detectFileType(content []byte) string {
	if len(content) < 4 {
		return "unknown (too small)"
	}

	// Check for PDF signature
	if len(content) >= 5 && string(content[:5]) == "%PDF-" {
		return "PDF"
	}

	// Check for ZIP-based formats (DOCX, etc.)
	if content[0] == 0x50 && content[1] == 0x4B && content[2] == 0x03 && content[3] == 0x04 {
		return "ZIP/DOCX"
	}

	// Check for old DOC format
	if len(content) >= 8 && content[0] == 0xD0 && content[1] == 0xCF && content[2] == 0x11 && content[3] == 0xE0 {
		return "DOC (OLE2)"
	}

	return fmt.Sprintf("unknown (starts with: %02x %02x %02x %02x)", content[0], content[1], content[2], content[3])
}

// isPDF checks if the file has a valid PDF signature
func isPDF(content []byte) bool {
	if len(content) < 5 {
		return false
	}
	return string(content[:5]) == "%PDF-"
}

// extractFromPDF extracts text from a PDF file with multiple fallback mechanisms
func (e *DefaultTextExtractor) extractFromPDF(fileContent []byte) (string, error) {
	var errors []string

	// Method 1: Try dslipak/pdf (no license warnings, good compatibility)
	text, err := e.extractFromPDFWithDslipak(fileContent)
	if err == nil && len(strings.TrimSpace(text)) > 0 {
		return text, nil
	}
	if err != nil {
		errors = append(errors, fmt.Sprintf("dslipak: %v", err))
	}

	// Method 2: Try ledongthuc/pdf
	text, err = e.extractFromPDFPrimary(fileContent)
	if err == nil && len(strings.TrimSpace(text)) > 0 {
		return text, nil
	}
	if err != nil {
		errors = append(errors, fmt.Sprintf("ledongthuc: %v", err))
	}

	// Method 3: Try UniPDF (most robust but shows license warnings)
	text, err = e.extractFromPDFWithUniPDF(fileContent)
	if err == nil && len(strings.TrimSpace(text)) > 0 {
		return text, nil
	}
	if err != nil {
		errors = append(errors, fmt.Sprintf("unipdf: %v", err))
	}

	// Method 4: Try pdfcpu as last resort
	text, err = e.extractFromPDFWithPdfcpu(fileContent)
	if err == nil && len(strings.TrimSpace(text)) > 0 {
		return text, nil
	}
	if err != nil {
		errors = append(errors, fmt.Sprintf("pdfcpu: %v", err))
	}

	// All methods failed
	return "", fmt.Errorf("all PDF extraction methods failed: %s", strings.Join(errors, "; "))
}

// extractFromPDFWithUniPDF uses unidoc/unipdf library (most robust)
func (e *DefaultTextExtractor) extractFromPDFWithUniPDF(fileContent []byte) (string, error) {
	// Disable UniPDF logging
	common.SetLogger(common.NewConsoleLogger(common.LogLevelError))

	reader := bytes.NewReader(fileContent)

	// Open PDF from bytes
	pdfReader, err := unipdf.NewPdfReader(reader)
	if err != nil {
		return "", fmt.Errorf("failed to open PDF: %w", err)
	}

	var textBuilder strings.Builder
	numPages, err := pdfReader.GetNumPages()
	if err != nil {
		return "", fmt.Errorf("failed to get page count: %w", err)
	}

	// Extract text from each page
	for pageNum := 1; pageNum <= numPages; pageNum++ {
		page, err := pdfReader.GetPage(pageNum)
		if err != nil {
			continue
		}

		ex, err := extractor.New(page)
		if err != nil {
			continue
		}

		text, err := ex.ExtractText()
		if err != nil {
			continue
		}

		textBuilder.WriteString(text)
		textBuilder.WriteString("\n\n")
	}

	extractedText := textBuilder.String()
	if len(strings.TrimSpace(extractedText)) == 0 {
		return "", fmt.Errorf("no text content found")
	}

	return extractedText, nil
}

// extractFromPDFWithDslipak uses dslipak/pdf library
func (e *DefaultTextExtractor) extractFromPDFWithDslipak(fileContent []byte) (string, error) {
	reader := bytes.NewReader(fileContent)

	pdfReader, err := dslipakpdf.NewReader(reader, int64(len(fileContent)))
	if err != nil {
		return "", fmt.Errorf("failed to open PDF: %w", err)
	}

	var textBuilder strings.Builder

	// Extract text from all pages
	for pageNum := 1; pageNum <= pdfReader.NumPage(); pageNum++ {
		page := pdfReader.Page(pageNum)
		content := page.Content()

		text := content.Text
		for _, textItem := range text {
			textBuilder.WriteString(textItem.S)
			textBuilder.WriteString(" ")
		}
		textBuilder.WriteString("\n\n")
	}

	extractedText := textBuilder.String()
	if len(strings.TrimSpace(extractedText)) == 0 {
		return "", fmt.Errorf("no text content found")
	}

	return extractedText, nil
}

// extractFromPDFPrimary uses ledongthuc/pdf library
func (e *DefaultTextExtractor) extractFromPDFPrimary(fileContent []byte) (string, error) {
	reader := bytes.NewReader(fileContent)

	// Open PDF from bytes
	pdfReader, err := ledongpdf.NewReader(reader, int64(len(fileContent)))
	if err != nil {
		return "", fmt.Errorf("failed to open PDF: %w", err)
	}

	var textBuilder strings.Builder
	numPages := pdfReader.NumPage()

	// Extract text from each page
	for pageNum := 1; pageNum <= numPages; pageNum++ {
		page := pdfReader.Page(pageNum)
		if page.V.IsNull() {
			continue
		}

		text, err := page.GetPlainText(nil)
		if err != nil {
			// Log error but continue with other pages
			continue
		}

		textBuilder.WriteString(text)
		textBuilder.WriteString("\n\n") // Add spacing between pages
	}

	extractedText := textBuilder.String()
	if len(strings.TrimSpace(extractedText)) == 0 {
		return "", fmt.Errorf("no text content found in PDF")
	}

	return extractedText, nil
}

// extractFromPDFWithPdfcpu uses pdfcpu library as fallback
func (e *DefaultTextExtractor) extractFromPDFWithPdfcpu(fileContent []byte) (string, error) {
	// Create temporary file for pdfcpu processing
	tmpFile, err := os.CreateTemp("", "resume-*.pdf")
	if err != nil {
		return "", fmt.Errorf("failed to create temp file: %w", err)
	}
	defer os.Remove(tmpFile.Name())
	defer tmpFile.Close()

	// Write content to temp file
	if _, err := tmpFile.Write(fileContent); err != nil {
		return "", fmt.Errorf("failed to write temp file: %w", err)
	}
	if err := tmpFile.Close(); err != nil {
		return "", fmt.Errorf("failed to close temp file: %w", err)
	}

	// Create output directory for extracted text
	outputDir, err := os.MkdirTemp("", "pdf-extract-*")
	if err != nil {
		return "", fmt.Errorf("failed to create output dir: %w", err)
	}
	defer os.RemoveAll(outputDir)

	// Extract text using pdfcpu
	if err := pdfcpuapi.ExtractContentFile(tmpFile.Name(), outputDir, nil, nil); err != nil {
		return "", fmt.Errorf("pdfcpu extraction failed: %w", err)
	}

	// Read extracted text files
	var textBuilder strings.Builder
	files, err := filepath.Glob(filepath.Join(outputDir, "*.txt"))
	if err != nil {
		return "", fmt.Errorf("failed to read extracted files: %w", err)
	}

	for _, file := range files {
		content, err := os.ReadFile(file)
		if err != nil {
			continue
		}
		textBuilder.Write(content)
		textBuilder.WriteString("\n\n")
	}

	extractedText := textBuilder.String()
	if len(strings.TrimSpace(extractedText)) == 0 {
		return "", fmt.Errorf("no text content found in PDF")
	}

	return extractedText, nil
}

// extractFromDOCX extracts text from a DOCX file
func (e *DefaultTextExtractor) extractFromDOCX(fileContent []byte) (string, error) {
	reader := bytes.NewReader(fileContent)

	// Read DOCX from bytes
	docxReader, err := docx.ReadDocxFromMemory(reader, int64(len(fileContent)))
	if err != nil {
		return "", fmt.Errorf("failed to open DOCX: %w", err)
	}

	// Extract text from document - the library provides a simple text extraction method
	extractedText := docxReader.Editable().GetContent()

	if len(strings.TrimSpace(extractedText)) == 0 {
		return "", fmt.Errorf("no text content found in DOCX")
	}

	return extractedText, nil
}

// CleanText performs basic text cleaning
func CleanText(text string) string {
	// Remove excessive whitespace
	lines := strings.Split(text, "\n")
	var cleanLines []string

	for _, line := range lines {
		line = strings.TrimSpace(line)
		if len(line) > 0 {
			cleanLines = append(cleanLines, line)
		}
	}

	return strings.Join(cleanLines, "\n")
}
