# Design Decision: Export PDF/DOCX Formats

**Date**: 2025-12-26
**Status**: Planned
**Author**: Claude
**Depends On**: 002_export_functionality.md (Phase 2)

## Overview

Extend the export functionality to support PDF and DOCX formats, providing professional report generation and editable document formats for resume analysis results.

## Problem Statement

Current export supports JSON/CSV which are:
- **JSON**: Good for developers, not user-friendly for sharing
- **CSV**: Spreadsheet format, lacks visual appeal

Users need:
- **PDF**: Professional reports for sharing with recruiters/managers
- **DOCX**: Editable documents for further customization

## Proposed Solution

### Phase 2A: PDF Export
Generate professional PDF reports with:
- Header with contact information
- Visual sections (Skills, Experience, Education)
- AI analysis insights with formatting
- Clean, printable layout

### Phase 2B: DOCX Export
Generate editable Word documents with:
- Styled headings
- Tables for structured data
- Bullet lists
- Professional formatting

## Technical Approach

### PDF Generation Library Selection

**Option 1: gofpdf** ⭐ Recommended
- **Pros**:
  - Pure Go, no dependencies
  - Simple API
  - Good documentation
  - Active maintenance
  - ~2K stars on GitHub
- **Cons**:
  - Basic features only
  - Limited advanced layout
- **Package**: `github.com/jung-kurt/gofpdf`

**Option 2: gopdf**
- **Pros**:
  - More features
  - Better typography
- **Cons**:
  - Complex API
  - Less documentation
- **Package**: `github.com/signintech/gopdf`

**Option 3: unipdf** (Commercial)
- **Pros**:
  - Enterprise features
  - Advanced layout
- **Cons**:
  - Requires license
  - Overkill for this use case

**Decision**: Use **gofpdf** for simplicity and zero licensing issues.

### DOCX Generation Library Selection

**Option 1: docx (nguyenthenguyen)** ⭐ Recommended
- **Pros**:
  - Already imported in project (for resume parsing)
  - Can create and modify DOCX
  - Simple API
- **Cons**:
  - Limited advanced features
- **Package**: `github.com/nguyenthenguyen/docx`

**Option 2: unioffice** (Commercial)
- **Pros**:
  - Professional features
  - Full Office suite support
- **Cons**:
  - Requires license

**Decision**: Use **nguyenthenguyen/docx** - already in dependencies.

## Data Schema Changes

**No database changes needed.**

Export reads existing `user_profile` data.

## PDF Layout Design

### Page Structure

```
┌─────────────────────────────────────────────┐
│                                              │
│  [Logo/Header]     RESUME ANALYSIS REPORT    │
│                                              │
│  John Doe                                    │
│  john@example.com | +1234567890              │
│  San Francisco, CA | linkedin.com/in/johndoe │
│                                              │
├──────────────────────────────────────────────┤
│                                              │
│  PROFESSIONAL SUMMARY                        │
│  ────────────────────────────────────────   │
│  [Summary text with proper line wrapping]    │
│                                              │
│  SKILLS                                      │
│  ────────────────────────────────────────   │
│  Technical: Python • Go • React • Docker     │
│  Soft: Leadership • Communication            │
│                                              │
│  WORK EXPERIENCE                             │
│  ────────────────────────────────────────   │
│  Senior Engineer at Tech Corp (3.5 years)    │
│  • Led backend team development              │
│  • Improved system performance by 40%        │
│                                              │
│  EDUCATION                                   │
│  ────────────────────────────────────────   │
│  BS Computer Science - Stanford (2015)       │
│                                              │
│  AI ANALYSIS                                 │
│  ────────────────────────────────────────   │
│  Strengths:                                  │
│  • Strong technical foundation               │
│  • Leadership experience                     │
│                                              │
│  Areas for Growth:                           │
│  • Limited frontend expertise                │
│                                              │
│  Recommended Roles:                          │
│  • Senior Backend Engineer                   │
│  • Technical Lead                            │
│                                              │
├──────────────────────────────────────────────┤
│  Generated: 2025-12-26 | Job ID: job_abc123  │
└──────────────────────────────────────────────┘
```

### PDF Styling

**Colors**:
- Header: Dark blue (#1a365d)
- Section titles: Medium blue (#2563eb)
- Body text: Black (#000000)
- Subtle lines: Light gray (#e2e8f0)

**Fonts**:
- Title: Arial Bold 18pt
- Section Headers: Arial Bold 14pt
- Body: Arial Regular 11pt
- Footer: Arial 9pt

**Spacing**:
- Margins: 20mm all sides
- Line height: 1.3
- Section spacing: 10mm

## DOCX Layout Design

### Document Structure

```xml
<document>
  <heading1>Resume Analysis Report</heading1>

  <paragraph>
    <bold>Name:</bold> John Doe<br/>
    <bold>Email:</bold> john@example.com<br/>
    <bold>Location:</bold> San Francisco, CA
  </paragraph>

  <heading2>Professional Summary</heading2>
  <paragraph>[summary text]</paragraph>

  <heading2>Skills</heading2>
  <table>
    <row><cell>Technical</cell><cell>Python, Go, React</cell></row>
    <row><cell>Soft</cell><cell>Leadership, Communication</cell></row>
  </table>

  <heading2>Work Experience</heading2>
  <bulletList>
    <item>Senior Engineer at Tech Corp (3.5 years)</item>
    <bulletList>
      <item>Led backend team development</item>
      <item>Improved performance by 40%</item>
    </bulletList>
  </bulletList>

  <heading2>AI Analysis</heading2>
  <heading3>Strengths</heading3>
  <bulletList>
    <item>Strong technical foundation</item>
  </bulletList>
</document>
```

## Implementation Plan

### Phase 2A: PDF Export

**Step 1**: Install gofpdf
```bash
go get github.com/jung-kurt/gofpdf
```

**Step 2**: Create PDFExporter
```go
// internal/exporter/pdf_exporter.go
type PDFExporter struct {
    pdf *gofpdf.Fpdf
}

func (e *PDFExporter) ExportPDF(ctx context.Context, profile *UserProfile) ([]byte, error)
```

**Step 3**: Implement layout functions
- `addHeader(name, email, phone, location)`
- `addSection(title string)`
- `addSummary(text string)`
- `addSkills(skills map[string][]string)`
- `addExperience(experiences []ExperienceEntry)`
- `addEducation(education []EducationEntry)`
- `addAIAnalysis(strengths, weaknesses, recommendations)`
- `addFooter(jobID, timestamp)`

**Step 4**: Integrate with DefaultExporter
```go
case FormatPDF:
    return e.pdfExporter.ExportPDF(ctx, profile)
```

### Phase 2B: DOCX Export

**Step 1**: Already have library imported

**Step 2**: Create DOCXExporter
```go
// internal/exporter/docx_exporter.go
type DOCXExporter struct{}

func (e *DOCXExporter) ExportDOCX(ctx context.Context, profile *UserProfile) ([]byte, error)
```

**Step 3**: Implement document building
- `createDocument()`
- `addHeading(level int, text string)`
- `addParagraph(text string)`
- `addTable(headers, rows)`
- `addBulletList(items []string)`

**Step 4**: Integrate with DefaultExporter
```go
case FormatDOCX:
    return e.docxExporter.ExportDOCX(ctx, profile)
```

## API Changes

### Updated Endpoint

**GET** `/api/analysis/export?job_id={job_id}&format={format}`

**Supported formats**: json, csv, **pdf**, **docx**

**Response headers**:
```
PDF:
  Content-Type: application/pdf
  Content-Disposition: attachment; filename=resume_analysis_job_abc123.pdf

DOCX:
  Content-Type: application/vnd.openxmlformats-officedocument.wordprocessingml.document
  Content-Disposition: attachment; filename=resume_analysis_job_abc123.docx
```

## Frontend Changes

**Profile Page Update**:
```typescript
<button onClick={() => export('json')}>JSON</button>
<button onClick={() => export('csv')}>CSV</button>
<button onClick={() => export('pdf')}>PDF</button>  {/* NEW */}
<button onClick={() => export('docx')}>DOCX</button> {/* NEW */}
```

No other changes needed - download logic already handles binary files.

## Performance Considerations

### Generation Times

| Format | Estimated Time | Notes |
|--------|---------------|-------|
| JSON | <1ms | Baseline |
| CSV | 1-5ms | String building |
| **PDF** | **50-200ms** | Layout rendering, font loading |
| **DOCX** | **20-100ms** | XML generation |

### File Sizes

| Format | Typical Size | Max Expected |
|--------|-------------|--------------|
| JSON | 5 KB | 20 KB |
| CSV | 8 KB | 30 KB |
| **PDF** | **50-150 KB** | 500 KB |
| **DOCX** | **20-80 KB** | 300 KB |

### Caching Strategy

**Recommended**: Implement caching for PDF exports

```go
type ExportCache struct {
    cache map[string]*CachedExport
    mu    sync.RWMutex
}

type CachedExport struct {
    Data      []byte
    CreatedAt time.Time
    TTL       time.Duration
}

// Cache PDF exports for 1 hour
// Invalidate on profile update (future)
```

**Benefits**:
- Reduce server load for repeated PDF downloads
- Improve response time from 200ms → <5ms
- TTL ensures fresh data

## Error Handling

### PDF Generation Errors

1. **Font loading failed**: Fall back to default font
2. **Image processing error**: Skip images, continue
3. **Text too long**: Auto-wrap or truncate with "..."
4. **Memory limit**: Return 500, log error

### DOCX Generation Errors

1. **XML corruption**: Validate structure before return
2. **Special characters**: XML escape all user content
3. **Table overflow**: Split into multiple tables

## Testing Strategy

### Unit Tests

**PDF Exporter**:
- [ ] Generate PDF with complete profile
- [ ] Handle nil fields gracefully
- [ ] Text wrapping works correctly
- [ ] Special characters render properly
- [ ] File is valid PDF (open with reader)

**DOCX Exporter**:
- [ ] Generate DOCX with complete profile
- [ ] Handle nil fields
- [ ] Tables format correctly
- [ ] Bullet lists work
- [ ] File is valid DOCX (open in Word)

### Integration Tests

- [ ] Export PDF via API endpoint
- [ ] Export DOCX via API endpoint
- [ ] Downloaded files open correctly
- [ ] Large profiles (many experiences) work
- [ ] Special characters in all formats

### Visual Testing

- [ ] Open PDF in Adobe Reader
- [ ] Verify layout matches design
- [ ] Check font rendering
- [ ] Verify page breaks
- [ ] Open DOCX in Microsoft Word
- [ ] Verify styles applied correctly
- [ ] Check table formatting

## Security Considerations

1. **File size limits**: Max 10MB per export (prevent memory exhaustion)
2. **Content sanitization**: Escape special characters
3. **Path traversal**: Sanitize filename in Content-Disposition
4. **Resource limits**: Timeout PDF generation at 10 seconds

## Dependencies

**New Go Dependencies**:
```bash
go get github.com/jung-kurt/gofpdf
# docx already imported: github.com/nguyenthenguyen/docx
```

**No new frontend dependencies needed.**

## Rollback Plan

If PDF/DOCX generation causes issues:

1. **Feature flag**: Disable PDF/DOCX options in dropdown
2. **Endpoint check**: Return 501 Not Implemented
3. **Fallback**: Suggest JSON/CSV formats
4. **Monitor**: Track error rates and file sizes

## Performance Benchmarks

### Target Metrics

- **PDF Generation**: <200ms for typical profile (P95)
- **DOCX Generation**: <100ms for typical profile (P95)
- **Memory Usage**: <50MB per generation
- **Concurrent Exports**: Support 10 simultaneous exports

### Load Testing

Test with:
- Small profile (1 experience, 1 education): ~50ms
- Medium profile (5 experiences, 2 education): ~100ms
- Large profile (10+ experiences, 5 education): ~200ms

## Future Enhancements

### PDF Enhancements
1. **Custom templates**: Let users choose report style
2. **Company logo**: Upload logo for header
3. **Color themes**: Different color schemes
4. **Charts/graphs**: Visualize skills distribution
5. **QR code**: Link to online portfolio

### DOCX Enhancements
1. **Custom styles**: User-defined Word styles
2. **Comments**: Add review comments in document
3. **Track changes**: Enable for editing
4. **Merge with resume**: Combine with original resume

### Optimization
1. **Parallel generation**: Generate PDF and DOCX concurrently
2. **Background jobs**: Async generation for large files
3. **CDN caching**: Cache exports at edge
4. **Compression**: Gzip exports to reduce size

## Success Metrics

### Adoption
- **Target**: 40% of users export at least once
- **PDF adoption**: 60% of exports
- **DOCX adoption**: 30% of exports
- **JSON/CSV**: 10% of exports (developer use)

### Performance
- **P50 latency**: <50ms for PDF
- **P95 latency**: <200ms for PDF
- **Error rate**: <0.1%
- **File size**: Average 80KB for PDF

### User Satisfaction
- **Survey**: "How useful is PDF export?" → Target >4.0/5.0
- **Repeat usage**: 30% of users export multiple times
- **Sharing**: Track if PDFs are emailed/shared

## Implementation Checklist

### Backend
- [ ] Install gofpdf library
- [ ] Create `pdf_exporter.go`
- [ ] Implement PDF layout functions
- [ ] Create `docx_exporter.go`
- [ ] Implement DOCX structure builders
- [ ] Update `default_exporter.go` to route PDF/DOCX
- [ ] Add unit tests for both exporters
- [ ] Add integration tests
- [ ] Performance testing
- [ ] Error handling edge cases

### Frontend
- [ ] Add PDF option to dropdown
- [ ] Add DOCX option to dropdown
- [ ] Test file downloads
- [ ] Verify files open correctly
- [ ] Add loading indicators (for slow PDFs)
- [ ] Error handling UI

### Documentation
- [ ] Update API documentation
- [ ] Add PDF/DOCX examples
- [ ] User guide for exports
- [ ] Update architecture.md

### Deployment
- [ ] Test on staging
- [ ] Load testing
- [ ] Monitor error rates
- [ ] Deploy to production
- [ ] Monitor adoption metrics

## References

- **gofpdf docs**: https://pkg.go.dev/github.com/jung-kurt/gofpdf
- **gofpdf examples**: https://github.com/jung-kurt/gofpdf/tree/master/pdf
- **docx library**: https://github.com/nguyenthenguyen/docx
- **Phase 1**: `002_export_functionality.md`

---

**Estimated Effort**: 2-3 days
**Priority**: Medium
**Dependencies**: Export infrastructure (complete)
**Risks**: PDF generation performance, library limitations
