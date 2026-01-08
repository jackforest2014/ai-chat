# Design Decision: Export Analysis Results

**Date**: 2025-12-26
**Status**: Partially Implemented (JSON/CSV complete, PDF/DOCX pending)
**Author**: Claude

## Overview

Enable users to download their resume analysis results in multiple formats (JSON, CSV, PDF, DOCX). This allows users to:
- Share results with others
- Archive analysis for future reference
- Import data into other systems
- Print professional reports

## Problem Statement

Currently, analysis results are only viewable in the web interface. Users cannot:
- Save results locally
- Share results offline
- Use data in external tools
- Generate printable reports

## Proposed Solution

Add export functionality with multiple format support:
- **JSON**: Machine-readable, complete data export
- **CSV**: Spreadsheet-compatible, flattened structure
- **PDF**: Professional report format (future)
- **DOCX**: Editable document format (future)

## Architecture

### Package Structure

```
websocket-server/internal/exporter/
├── exporter.go           # Main interface & types
├── default_exporter.go   # Implementation coordinator
├── json_exporter.go      # JSON export logic
├── csv_exporter.go       # CSV export logic
├── pdf_exporter.go       # PDF export logic (future)
└── docx_exporter.go      # DOCX export logic (future)
```

### Interface Design

```go
type Exporter interface {
    Export(ctx context.Context, profile *UserProfile, format Format) ([]byte, error)
    GetContentType(format Format) string
    GetFileExtension(format Format) string
}

type Format string
const (
    FormatJSON Format = "json"
    FormatCSV  Format = "csv"
    FormatPDF  Format = "pdf"
    FormatDOCX Format = "docx"
)
```

## Data Schema Changes

### No Database Changes

Export reads existing `user_profile` data. No new tables or columns needed.

### Export Data Structure

**JSON Format**:
```json
{
  "job_id": "job_abc123",
  "personal_info": {
    "name": "John Doe",
    "email": "john@example.com",
    "phone": "+1234567890",
    "linkedin_url": "https://linkedin.com/in/johndoe",
    "age": 30,
    "race": "Asian",
    "location": "San Francisco, CA",
    "total_work_years": 8.5
  },
  "skills": {
    "technical": ["Python", "Go", "React"],
    "soft": ["Leadership", "Communication"]
  },
  "experience": [
    {
      "company": "Tech Corp",
      "role": "Senior Engineer",
      "years": 3.5,
      "description": "Led backend team..."
    }
  ],
  "education": [
    {
      "degree": "BS Computer Science",
      "institution": "Stanford University",
      "year": 2015
    }
  ],
  "summary": "Experienced software engineer...",
  "job_recommendations": [
    "Senior Backend Engineer",
    "Technical Lead"
  ],
  "strengths": [
    "Strong technical skills",
    "Leadership experience"
  ],
  "weaknesses": [
    "Limited frontend experience"
  ],
  "exported_at": "2025-12-26T10:30:00Z"
}
```

**CSV Format** (Sectioned):
```csv
PERSONAL INFORMATION
Name,John Doe
Email,john@example.com
Phone,+1234567890
...

SKILLS
Category,Skills
technical,"Python, Go, React"
soft,"Leadership, Communication"

WORK EXPERIENCE
Company,Role,Years,Description
Tech Corp,Senior Engineer,3.5,Led backend team...
...
```

## Business Logic

### Export Flow

```
User clicks Export button
    ↓
Frontend: Show dropdown (JSON, CSV, PDF, DOCX)
    ↓
User selects format
    ↓
Frontend: GET /api/analysis/export?job_id=X&format=csv
    ↓
Backend: Validate job completed
    ↓
Backend: Fetch user_profile by job_id
    ↓
Backend: Call exporter.Export(profile, format)
    ↓
Backend: Set download headers
    ↓
Backend: Stream file to response
    ↓
Frontend: Trigger browser download
```

### Validation Rules

1. **Job must be completed**: Only export completed analyses
2. **Profile must exist**: Return 404 if no profile data
3. **Format must be valid**: Reject unsupported formats
4. **Format must be implemented**: Return error for PDF/DOCX (phase 2)

### Format-Specific Logic

**JSON Exporter**:
- Uses `json.MarshalIndent` with 2-space indentation
- Preserves all data types (numbers, arrays, objects)
- Includes export timestamp
- ~2-10 KB typical size

**CSV Exporter**:
- Sections with headers (PERSONAL INFO, SKILLS, etc.)
- Flattens nested structures
- Arrays joined with commas
- Experience/Education as rows
- ~3-15 KB typical size
- Compatible with Excel, Google Sheets

**PDF Exporter** (Future):
- Professional report layout
- Sections with visual hierarchy
- Skills as tags/badges
- Timeline for experience
- ~50-200 KB typical size

**DOCX Exporter** (Future):
- Editable document
- Styled headings
- Tables for structured data
- ~20-100 KB typical size

## API Endpoints

### New Endpoint

**GET** `/api/analysis/export?job_id={job_id}&format={format}`

**Request**:
```
Query params:
- job_id (required): The analysis job ID
- format (optional, default: json): Export format (json|csv|pdf|docx)
```

**Success Response** (200 OK):
```
Headers:
  Content-Type: application/json | text/csv | application/pdf | application/vnd.openxmlformats-officedocument.wordprocessingml.document
  Content-Disposition: attachment; filename=resume_analysis_job_abc123.json
  Content-Length: 5432

Body: Binary file data
```

**Error Responses**:

400 Bad Request - Invalid format:
```json
{
  "error": "Invalid format",
  "message": "Supported formats: json, csv, pdf, docx"
}
```

400 Bad Request - Not completed:
```json
{
  "error": "Analysis not yet completed",
  "message": "Only completed analysis jobs can be exported"
}
```

404 Not Found - No result:
```json
{
  "error": "Result not found"
}
```

500 Internal Server Error - Export failed:
```json
{
  "error": "Export failed",
  "message": "PDF export not yet implemented"
}
```

## Frontend Components

### UI Changes

**Profile Page** (`/profile`):
- Add "Export" button (green Download icon) for completed jobs
- Position: After Interview Prep, before Delete
- Dropdown menu on click

**Export Dropdown**:
```typescript
<div className="relative">
  <button onClick={() => toggle()} title="Export">
    <Download className="w-4 h-4" />
  </button>
  {open && (
    <div className="dropdown">
      <button onClick={() => export('json')}>JSON</button>
      <button onClick={() => export('csv')}>CSV</button>
      <button onClick={() => export('pdf')} disabled>PDF (Coming Soon)</button>
      <button onClick={() => export('docx')} disabled>DOCX (Coming Soon)</button>
    </div>
  )}
</div>
```

**Analysis Detail Page** (`/analysis/[jobId]`):
- Add same export button to result page header
- Show export options in dropdown

### State Management

```typescript
const [exportDropdownOpen, setExportDropdownOpen] = useState<string | null>(null)
```

### Download Logic

```typescript
const handleExport = async (jobId: string, format: string) => {
  const response = await fetch(`/api/analysis/export?job_id=${jobId}&format=${format}`)
  const blob = await response.blob()

  // Get filename from Content-Disposition header
  const disposition = response.headers.get('Content-Disposition')
  const filename = extractFilename(disposition) || `resume_analysis_${jobId}.${format}`

  // Trigger download
  const url = window.URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  window.URL.revokeObjectURL(url)
}
```

## Data Points & Monitoring

### Metrics to Track

1. **Export counts by format**: Track which formats are most popular
2. **Export file sizes**: Monitor average/max sizes
3. **Export errors**: Track failure rates and reasons
4. **Export latency**: Time to generate each format

### Logs

```go
log.Printf("Exported analysis job %s as %s (%d bytes)", jobID, format, len(data))
log.Printf("Error exporting analysis result: %v", err)
```

### Traces (Future)

- Span: `export_analysis`
  - Attributes: job_id, format, file_size
  - Events: fetch_profile, generate_export, send_response

## Performance Considerations

### Export Generation Times

| Format | Est. Time | Notes |
|--------|-----------|-------|
| JSON | <1ms | Simple marshaling |
| CSV | 1-5ms | String building + CSV writer |
| PDF | 50-200ms | Layout rendering (future) |
| DOCX | 20-100ms | XML generation (future) |

### Caching Strategy

**Phase 1 (Current)**: No caching
- Exports generated on-demand
- Small file sizes (<50KB)
- Fast generation (<5ms for JSON/CSV)

**Phase 2 (Future)**: Optional caching
- Cache PDF exports (expensive to generate)
- TTL: 1 hour
- Invalidate on profile update
- Storage: Redis or filesystem

### Resource Limits

- **Timeout**: 10 seconds (generous for PDF generation)
- **Max file size**: 10MB (profile data shouldn't exceed this)
- **Concurrent exports**: No limit (CPU-bound, not I/O-bound)

## Security Considerations

1. **Authorization**: (Future) Verify user owns the job
2. **Data sanitization**: Escape special characters in CSV
3. **File size limits**: Prevent memory exhaustion
4. **Content-Type validation**: Prevent MIME confusion attacks

## Testing Considerations

### Unit Tests

**JSON Exporter**:
- Exports complete profile correctly
- Handles nil fields
- Includes export timestamp
- Valid JSON output

**CSV Exporter**:
- Sections properly formatted
- Special characters escaped (commas, quotes)
- Arrays properly joined
- Empty fields handled

**Default Exporter**:
- Routes to correct format exporter
- Returns correct Content-Type
- Returns correct file extension
- Rejects unsupported formats

### Integration Tests

1. End-to-end export flow
2. Download in browser works correctly
3. Filename matches Content-Disposition
4. Large profiles (many experiences)

### Manual Testing

1. **JSON**: Open in JSON viewer, validate structure
2. **CSV**: Open in Excel/Sheets, verify formatting
3. **All formats**: Verify special characters (quotes, commas, newlines)

## Rollback Plan

If issues arise:
1. Remove export button from frontend
2. Disable endpoint via feature flag
3. Monitor for memory leaks
4. Revert to previous version if crashes occur

## Phase 2: PDF/DOCX Implementation

### PDF Generation (Future)

**Library**: `github.com/jung-kurt/gofpdf` or `github.com/signintech/gopdf`

**Layout**:
```
[Header: Name, Contact Info]
─────────────────────────
[Profile Summary]

SKILLS
• Technical: Python, Go, React
• Soft: Leadership, Communication

EXPERIENCE
2020-2023 | Senior Engineer at Tech Corp
• Led backend team...
• Improved performance...

EDUCATION
2015 | BS Computer Science
Stanford University

AI ANALYSIS
Strengths: ...
Weaknesses: ...
Recommendations: ...
```

### DOCX Generation (Future)

**Library**: `github.com/nguyenthenguyen/docx` (already imported for resume parsing)

**Structure**:
- Styled headings (Heading 1, 2)
- Tables for experience/education
- Bullet lists for skills
- Footer with export metadata

## Future Enhancements

1. **Custom templates**: Let users choose report style
2. **Email export**: Send results to user's email
3. **Bulk export**: Export all analyses as ZIP
4. **Scheduled exports**: Auto-export completed jobs
5. **Export history**: Track all user exports
6. **Watermarks**: Add branding to PDF/DOCX

## Dependencies

**Go Packages** (Phase 1):
- `encoding/json` - JSON export ✅
- `encoding/csv` - CSV export ✅

**Go Packages** (Phase 2):
- `github.com/jung-kurt/gofpdf` - PDF generation
- `github.com/nguyenthenguyen/docx` - DOCX generation

## References

- Exporter Package: `/websocket-server/internal/exporter/`
- Analysis Handler: `/websocket-server/internal/handler/analysis.go`
- Profile Page: `/chat-app/src/app/profile/page.tsx`
- User Profile Model: `/websocket-server/pkg/models/analysis.go`
