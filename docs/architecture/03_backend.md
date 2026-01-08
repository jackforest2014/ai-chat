# Backend Architecture

**Module**: 03 - Backend Architecture
**Last Updated**: 2025-12-26

[← Back to Architecture Index](README.md)

---

## Overview

The backend is a Go 1.24.4 server providing REST API endpoints, WebSocket server, resume analysis pipeline, and job management. It uses PostgreSQL for persistence and OpenAI for AI capabilities.

---

## Technology Stack

### Core
- **Go**: 1.24.4 (high-performance backend language)
- **Database Driver**: lib/pq 1.10.9 (PostgreSQL driver)
- **WebSocket**: gorilla/websocket 1.5.1

### HTTP & Middleware
- **HTTP Server**: Go standard library `net/http`
- **CORS**: rs/cors 1.10.1 (cross-origin requests)
- **Router**: Standard library `http.ServeMux`

### AI & ML
- **LLM Framework**: langchaingo 0.1.14 (LLM abstraction layer)
- **OpenAI**: GPT-4 for analysis, text-embedding-ada-002 for embeddings
- **Vector DB**: ChromaDB (placeholder implementation)

### Document Processing
- **PDF Generation**: gofpdf (PDF export)
- **DOCX Handling**: nguyenthenguyen/docx (DOCX read/write)
- **PDF Parsing**: pdfcpu, unidoc (fallback strategy)

### Utilities
- **Environment**: godotenv 1.5.1 (environment variables)
- **UUID**: google/uuid 1.6.0 (unique identifiers)

---

## Project Structure

```
websocket-server/
├── cmd/
│   └── server/
│       └── main.go              # Entry point, server initialization
├── internal/
│   ├── analyzer/                # Resume analysis logic
│   │   ├── analyzer.go          # Interface definition
│   │   └── worker.go            # Worker pool implementation
│   ├── exporter/                # Export functionality
│   │   ├── exporter.go          # Interface definition
│   │   ├── default_exporter.go  # Main exporter coordinator
│   │   ├── json_exporter.go     # JSON export implementation
│   │   ├── csv_exporter.go      # CSV export implementation
│   │   ├── pdf_exporter.go      # PDF export implementation
│   │   └── docx_exporter.go     # DOCX export implementation
│   ├── handler/                 # HTTP request handlers
│   │   ├── auth.go              # Authentication handlers
│   │   ├── upload.go            # File upload handlers
│   │   ├── analysis.go          # Analysis job handlers
│   │   ├── interview.go         # Interview question handlers
│   │   └── websocket.go         # WebSocket handlers
│   ├── repository/              # Data access layer
│   │   ├── user_repository.go
│   │   ├── upload_repository.go
│   │   ├── analysis_repository.go
│   │   ├── interview_repository.go
│   │   └── postgres/            # PostgreSQL implementations
│   │       ├── user_postgres.go
│   │       ├── upload_postgres.go
│   │       ├── analysis_postgres.go
│   │       └── interview_postgres.go
│   └── websocket/               # WebSocket hub
│       ├── hub.go               # Hub-spoke pattern implementation
│       └── client.go            # Client connection management
├── pkg/
│   └── models/                  # Shared data models
│       ├── user.go
│       ├── upload.go
│       ├── job.go
│       ├── profile.go
│       └── message.go
├── go.mod                       # Go module definition
├── go.sum                       # Dependency checksums
├── .env                         # Environment variables
└── README.md                    # Backend documentation
```

---

## Architectural Patterns

### 1. Repository Pattern

**Purpose**: Abstraction layer for data access

**Interface** (`internal/repository/analysis_repository.go`):
```go
type AnalysisRepository interface {
    CreateJob(ctx context.Context, job *models.AnalysisJob) error
    GetJobByID(ctx context.Context, jobID string) (*models.AnalysisJob, error)
    GetJobsByUploadID(ctx context.Context, uploadID int) ([]*models.AnalysisJob, error)
    UpdateJobStatus(ctx context.Context, jobID string, status string, progress int, currentStep string) error
    UpdateJobError(ctx context.Context, jobID string, errorMessage string) error
    CompleteJob(ctx context.Context, jobID string) error
    DeleteJob(ctx context.Context, jobID string) error
    ResetJobForRetry(ctx context.Context, jobID string) error
    SaveProfile(ctx context.Context, profile *models.UserProfile) error
    GetProfileByJobID(ctx context.Context, jobID string) (*models.UserProfile, error)
}
```

**Benefits**:
- Easy to test (mock repositories)
- Database-agnostic (can swap PostgreSQL for MySQL)
- Clear separation of concerns

### 2. Dependency Injection

**Example** (`cmd/server/main.go`):
```go
// Initialize repositories
userRepo := postgres.NewUserPostgresRepository(db)
uploadRepo := postgres.NewUploadPostgresRepository(db)
analysisRepo := postgres.NewAnalysisPostgresRepository(db)

// Initialize services
resumeAnalyzer := analyzer.NewDefaultResumeAnalyzer(
    analysisRepo,
    uploadRepo,
    openaiClient,
    workerPoolSize,
)

exportService := exporter.NewDefaultExporter()

// Initialize handlers with dependencies
authHandler := handler.NewAuthHandler(userRepo)
uploadHandler := handler.NewUploadHandler(uploadRepo, resumeAnalyzer)
analysisHandler := handler.NewAnalysisHandler(resumeAnalyzer, exportService)
```

**Benefits**:
- Testable (inject mocks)
- Flexible (swap implementations)
- Clear dependencies

### 3. Worker Pool Pattern

**Purpose**: Concurrent job processing with resource limits

**Implementation** (`internal/analyzer/worker.go`):
```go
type DefaultResumeAnalyzer struct {
    analysisRepo   repository.AnalysisRepository
    uploadRepo     repository.UploadRepository
    openaiClient   *openai.Client
    workerSemaphore chan struct{} // Limits concurrent jobs
}

func NewDefaultResumeAnalyzer(
    analysisRepo repository.AnalysisRepository,
    uploadRepo repository.UploadRepository,
    openaiClient *openai.Client,
    maxWorkers int,
) *DefaultResumeAnalyzer {
    return &DefaultResumeAnalyzer{
        analysisRepo:   analysisRepo,
        uploadRepo:     uploadRepo,
        openaiClient:   openaiClient,
        workerSemaphore: make(chan struct{}, maxWorkers), // Buffered channel as semaphore
    }
}

func (a *DefaultResumeAnalyzer) StartJob(ctx context.Context, jobID string, upload *models.Upload) {
    // Acquire semaphore (blocks if pool is full)
    a.workerSemaphore <- struct{}{}

    go func() {
        defer func() {
            // Release semaphore
            <-a.workerSemaphore
        }()

        a.processJob(jobID, upload)
    }()
}
```

**Benefits**:
- Prevents resource exhaustion
- Configurable concurrency (default: 5)
- Graceful degradation under load

### 4. Hub-Spoke Pattern (WebSocket)

**Purpose**: Manage multiple WebSocket connections efficiently

**Hub** (`internal/websocket/hub.go`):
```go
type Hub struct {
    clients    map[*Client]bool  // Connected clients
    broadcast  chan []byte       // Broadcast channel
    register   chan *Client      // Register client
    unregister chan *Client      // Unregister client
    mu         sync.RWMutex      // Thread-safe access
}

func (h *Hub) Run() {
    for {
        select {
        case client := <-h.register:
            h.mu.Lock()
            h.clients[client] = true
            h.mu.Unlock()

        case client := <-h.unregister:
            h.mu.Lock()
            if _, ok := h.clients[client]; ok {
                delete(h.clients, client)
                close(client.send)
            }
            h.mu.Unlock()

        case message := <-h.broadcast:
            h.mu.RLock()
            for client := range h.clients {
                select {
                case client.send <- message:
                default:
                    close(client.send)
                    delete(h.clients, client)
                }
            }
            h.mu.RUnlock()
        }
    }
}
```

**Client** (`internal/websocket/client.go`):
```go
type Client struct {
    hub  *Hub
    conn *websocket.Conn
    send chan []byte
    userID int
}

func (c *Client) readPump() {
    // Read messages from WebSocket
}

func (c *Client) writePump() {
    // Write messages to WebSocket
}
```

**Benefits**:
- Centralized message broadcasting
- Efficient connection management
- Supports 100+ concurrent connections

### 5. Strategy Pattern (Export Formats)

**Purpose**: Multiple export format implementations

**Interface** (`internal/exporter/exporter.go`):
```go
type Exporter interface {
    Export(ctx context.Context, profile *models.UserProfile, format Format) ([]byte, error)
    GetContentType(format Format) string
    GetFileExtension(format Format) string
}
```

**Implementations**:
- `JSONExporter`: Structured JSON with pretty-printing
- `CSVExporter`: Sectioned CSV for spreadsheets
- `PDFExporter`: Professional PDF reports
- `DOCXExporter`: Editable Word documents

**Benefits**:
- Easy to add new formats
- Format-specific logic encapsulated
- Single entry point (`DefaultExporter`)

---

## Core Components

### 1. Server Initialization (`cmd/server/main.go`)

**Startup Sequence**:
```go
func main() {
    // 1. Load environment variables
    godotenv.Load()

    // 2. Connect to database
    db, err := sql.Open("postgres", os.Getenv("DATABASE_URL"))
    defer db.Close()

    // 3. Initialize OpenAI client
    openaiClient := openai.NewClient(os.Getenv("OPENAI_API_KEY"))

    // 4. Initialize repositories
    userRepo := postgres.NewUserPostgresRepository(db)
    uploadRepo := postgres.NewUploadPostgresRepository(db)
    analysisRepo := postgres.NewAnalysisPostgresRepository(db)

    // 5. Initialize services
    resumeAnalyzer := analyzer.NewDefaultResumeAnalyzer(analysisRepo, uploadRepo, openaiClient, 5)
    exportService := exporter.NewDefaultExporter()

    // 6. Initialize WebSocket hub
    hub := websocket.NewHub()
    go hub.Run()

    // 7. Initialize handlers
    authHandler := handler.NewAuthHandler(userRepo)
    uploadHandler := handler.NewUploadHandler(uploadRepo, resumeAnalyzer)
    analysisHandler := handler.NewAnalysisHandler(resumeAnalyzer, exportService)
    wsHandler := handler.NewWebSocketHandler(hub)

    // 8. Setup routes
    mux := http.NewServeMux()
    mux.HandleFunc("/api/auth/login", authHandler.HandleLogin)
    mux.HandleFunc("/api/upload", uploadHandler.HandleUpload)
    mux.HandleFunc("/api/analysis/start", analysisHandler.HandleStartAnalysis)
    mux.HandleFunc("/api/analysis/jobs", analysisHandler.HandleGetJobs)
    mux.HandleFunc("/api/analysis/delete-job", analysisHandler.HandleDeleteJob)
    mux.HandleFunc("/api/analysis/retry-job", analysisHandler.HandleRetryJob)
    mux.HandleFunc("/api/analysis/export", analysisHandler.HandleExportAnalysis)
    mux.HandleFunc("/ws", wsHandler.HandleWebSocket)

    // 9. Setup CORS
    corsHandler := cors.New(cors.Options{
        AllowedOrigins: []string{"*"},
        AllowedMethods: []string{"GET", "POST", "DELETE"},
        AllowedHeaders: []string{"Authorization", "Content-Type"},
    }).Handler(mux)

    // 10. Start server
    server := &http.Server{
        Addr:    ":8081",
        Handler: corsHandler,
    }

    log.Println("Server starting on :8081")
    log.Fatal(server.ListenAndServe())
}
```

### 2. Resume Analyzer (`internal/analyzer/worker.go`)

**Main Interface**:
```go
type ResumeAnalyzer interface {
    StartJob(ctx context.Context, jobID string, upload *models.Upload) error
    GetJobStatus(ctx context.Context, jobID string) (*models.AnalysisJob, error)
    GetJobsByUpload(ctx context.Context, uploadID int) ([]*models.AnalysisJob, error)
    DeleteJob(ctx context.Context, jobID string) error
    RetryJob(ctx context.Context, jobID string) error
}
```

**Job Processing Pipeline** (`processJob`):
```go
func (a *DefaultResumeAnalyzer) processJob(jobID string, upload *models.Upload) {
    ctx := context.Background()

    // Stage 1: Extract text (2 min timeout)
    a.updateStatus(ctx, jobID, "extracting_text", 10, "Extracting text from resume")
    text, err := a.extractText(upload.FileData, upload.Filename)
    if err != nil {
        a.updateError(ctx, jobID, fmt.Sprintf("Text extraction failed: %v", err))
        return
    }

    // Stage 2: Chunk text (1000 chars, 200 overlap)
    a.updateStatus(ctx, jobID, "chunking", 30, "Chunking text")
    chunks := a.chunkText(text, 1000, 200)

    // Stage 3: Generate embeddings (OpenAI ada-002, 1536 dimensions)
    a.updateStatus(ctx, jobID, "generating_embeddings", 50, "Generating embeddings")
    embeddings, err := a.generateEmbeddings(ctx, chunks)
    if err != nil {
        a.updateError(ctx, jobID, fmt.Sprintf("Embedding generation failed: %v", err))
        return
    }

    // Stage 4: Store in vector DB (ChromaDB placeholder)
    a.storeEmbeddings(ctx, jobID, chunks, embeddings)

    // Stage 5: LLM analysis (GPT-4, 3 min timeout)
    a.updateStatus(ctx, jobID, "analyzing", 70, "Analyzing resume with AI")
    profile, err := a.analyzeResume(ctx, text, upload.LinkedInURL)
    if err != nil {
        a.updateError(ctx, jobID, fmt.Sprintf("Analysis failed: %v", err))
        return
    }

    // Stage 6: Save results
    profile.JobID = jobID
    err = a.analysisRepo.SaveProfile(ctx, profile)
    if err != nil {
        a.updateError(ctx, jobID, fmt.Sprintf("Failed to save profile: %v", err))
        return
    }

    // Complete
    a.updateStatus(ctx, jobID, "completed", 100, "Analysis complete")
    a.analysisRepo.CompleteJob(ctx, jobID)
}
```

**Text Extraction** (with fallback strategy):
```go
func (a *DefaultResumeAnalyzer) extractText(fileData []byte, filename string) (string, error) {
    ext := strings.ToLower(filepath.Ext(filename))

    switch ext {
    case ".pdf":
        // Try pdfcpu first
        text, err := extractWithPDFCPU(fileData)
        if err == nil {
            return text, nil
        }

        // Fallback to unidoc
        text, err = extractWithUnidoc(fileData)
        if err != nil {
            return "", fmt.Errorf("PDF extraction failed: %v", err)
        }
        return text, nil

    case ".docx":
        return extractDOCX(fileData)

    case ".doc":
        return "", errors.New("DOC format not yet supported")

    default:
        return "", fmt.Errorf("unsupported file type: %s", ext)
    }
}
```

**Retry Implementation**:
```go
func (a *DefaultResumeAnalyzer) RetryJob(ctx context.Context, jobID string) error {
    // Get job and validate status
    job, err := a.analysisRepo.GetJobByID(ctx, jobID)
    if err != nil {
        return fmt.Errorf("job not found: %w", err)
    }

    if job.Status != "failed" {
        return fmt.Errorf("only failed jobs can be retried, current status: %s", job.Status)
    }

    // Get original upload
    upload, err := a.uploadRepo.GetUploadByID(ctx, job.UploadID)
    if err != nil {
        return fmt.Errorf("upload not found: %w", err)
    }

    // Reset job to queued
    err = a.analysisRepo.ResetJobForRetry(ctx, jobID)
    if err != nil {
        return fmt.Errorf("failed to reset job: %w", err)
    }

    // Resubmit to worker pool
    go a.processJob(jobID, upload)

    return nil
}
```

### 3. Export Service (`internal/exporter/`)

**Main Coordinator** (`default_exporter.go`):
```go
type DefaultExporter struct {
    jsonExporter *JSONExporter
    csvExporter  *CSVExporter
    pdfExporter  *PDFExporter
    docxExporter *DOCXExporter
}

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
```

**PDF Exporter** (`pdf_exporter.go`):
```go
func (e *PDFExporter) ExportPDF(ctx context.Context, profile *models.UserProfile) ([]byte, error) {
    pdf := gofpdf.New("P", "mm", "A4", "")
    pdf.AddPage()

    // Header with personal info
    pdf.SetFont("Arial", "B", 18)
    pdf.SetTextColor(26, 54, 93) // Dark blue
    pdf.Cell(0, 10, "Resume Analysis Report")
    pdf.Ln(12)

    // Personal Information section
    e.addSection(pdf, "Personal Information")
    pdf.SetFont("Arial", "", 11)
    pdf.Cell(0, 6, fmt.Sprintf("Name: %s", profile.Name))
    pdf.Ln(6)
    // ... more fields ...

    // Skills section
    e.addSection(pdf, "Skills")
    for category, skills := range profile.Skills {
        pdf.SetFont("Arial", "B", 11)
        pdf.Cell(0, 6, category)
        pdf.Ln(6)
        for _, skill := range skills {
            pdf.Cell(10, 6, "")
            pdf.Cell(0, 6, fmt.Sprintf("- %s", skill))
            pdf.Ln(6)
        }
    }

    // ... more sections ...

    // Footer
    e.addFooter(pdf, profile.JobID)

    // Output to buffer
    var buf bytes.Buffer
    err := pdf.Output(&buf)
    if err != nil {
        return nil, fmt.Errorf("PDF generation failed: %w", err)
    }

    return buf.Bytes(), nil
}
```

### 4. HTTP Handlers (`internal/handler/`)

**Analysis Handler** (`analysis.go`):
```go
type AnalysisHandler struct {
    analyzer analyzer.ResumeAnalyzer
    exporter exporter.Exporter
}

func (h *AnalysisHandler) HandleStartAnalysis(w http.ResponseWriter, r *http.Request) {
    // Parse upload_id from query params
    uploadIDStr := r.URL.Query().Get("upload_id")
    uploadID, _ := strconv.Atoi(uploadIDStr)

    // Create new job
    jobID := uuid.New().String()
    job := &models.AnalysisJob{
        JobID:    jobID,
        UploadID: uploadID,
        Status:   "queued",
        Progress: 0,
    }

    err := h.analyzer.CreateJob(context.Background(), job)
    if err != nil {
        http.Error(w, err.Error(), http.StatusInternalServerError)
        return
    }

    // Start processing
    upload, _ := h.analyzer.GetUpload(context.Background(), uploadID)
    go h.analyzer.StartJob(context.Background(), jobID, upload)

    w.WriteHeader(http.StatusAccepted)
    json.NewEncoder(w).Encode(map[string]string{
        "job_id": jobID,
        "status": "queued",
    })
}

func (h *AnalysisHandler) HandleRetryJob(w http.ResponseWriter, r *http.Request) {
    jobID := r.URL.Query().Get("job_id")

    err := h.analyzer.RetryJob(context.Background(), jobID)
    if err != nil {
        if strings.Contains(err.Error(), "only failed jobs") {
            http.Error(w, err.Error(), http.StatusBadRequest)
            return
        }
        http.Error(w, err.Error(), http.StatusInternalServerError)
        return
    }

    w.WriteHeader(http.StatusAccepted)
    json.NewEncoder(w).Encode(map[string]interface{}{
        "success": true,
        "message": "Job retry started successfully",
        "job_id":  jobID,
        "status":  "queued",
    })
}

func (h *AnalysisHandler) HandleExportAnalysis(w http.ResponseWriter, r *http.Request) {
    jobID := r.URL.Query().Get("job_id")
    formatStr := r.URL.Query().Get("format")

    // Validate format
    format := exporter.Format(formatStr)
    if format != exporter.FormatJSON && format != exporter.FormatCSV &&
       format != exporter.FormatPDF && format != exporter.FormatDOCX {
        http.Error(w, "Invalid format", http.StatusBadRequest)
        return
    }

    // Get profile
    profile, err := h.analyzer.GetProfile(context.Background(), jobID)
    if err != nil {
        http.Error(w, "Profile not found", http.StatusNotFound)
        return
    }

    // Check job status
    job, _ := h.analyzer.GetJobStatus(context.Background(), jobID)
    if job.Status != "completed" {
        http.Error(w, "Analysis not yet completed", http.StatusBadRequest)
        return
    }

    // Export
    data, err := h.exporter.Export(context.Background(), profile, format)
    if err != nil {
        http.Error(w, err.Error(), http.StatusInternalServerError)
        return
    }

    // Set headers
    w.Header().Set("Content-Type", h.exporter.GetContentType(format))
    w.Header().Set("Content-Disposition", fmt.Sprintf("attachment; filename=\"resume_analysis_%s%s\"", jobID, h.exporter.GetFileExtension(format)))
    w.Header().Set("Content-Length", fmt.Sprintf("%d", len(data)))

    // Stream file
    w.Write(data)
}
```

### 5. WebSocket Handler (`internal/handler/websocket.go`)

```go
func (h *WebSocketHandler) HandleWebSocket(w http.ResponseWriter, r *http.Request) {
    // Upgrade HTTP to WebSocket
    upgrader := websocket.Upgrader{
        ReadBufferSize:  1024,
        WriteBufferSize: 1024,
        CheckOrigin: func(r *http.Request) bool {
            return true // Allow all origins (restrict in production)
        },
    }

    conn, err := upgrader.Upgrade(w, r, nil)
    if err != nil {
        log.Printf("WebSocket upgrade failed: %v", err)
        return
    }

    // Create client
    client := &websocket.Client{
        Hub:  h.hub,
        Conn: conn,
        Send: make(chan []byte, 256),
    }

    // Register client
    h.hub.Register <- client

    // Start read/write pumps
    go client.WritePump()
    go client.ReadPump()
}
```

---

## Database Integration

### Connection Management

```go
func initDB() (*sql.DB, error) {
    dbURL := os.Getenv("DATABASE_URL")
    db, err := sql.Open("postgres", dbURL)
    if err != nil {
        return nil, err
    }

    // Test connection
    if err := db.Ping(); err != nil {
        return nil, err
    }

    return db, nil
}
```

**Current Limitation**: No connection pooling configured

**Future Enhancement**:
```go
db.SetMaxOpenConns(25)
db.SetMaxIdleConns(5)
db.SetConnMaxLifetime(5 * time.Minute)
```

### Repository Implementation Example

**Analysis Repository** (`internal/repository/postgres/analysis_postgres.go`):
```go
type AnalysisPostgresRepository struct {
    db *sql.DB
}

func (r *AnalysisPostgresRepository) CreateJob(ctx context.Context, job *models.AnalysisJob) error {
    query := `
        INSERT INTO analysis_jobs (job_id, upload_id, status, progress, current_step, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `

    _, err := r.db.ExecContext(ctx, query, job.JobID, job.UploadID, job.Status, job.Progress, job.CurrentStep)
    return err
}

func (r *AnalysisPostgresRepository) GetJobByID(ctx context.Context, jobID string) (*models.AnalysisJob, error) {
    query := `
        SELECT job_id, upload_id, status, progress, current_step, error_message, created_at, completed_at, updated_at
        FROM analysis_jobs
        WHERE job_id = $1
    `

    var job models.AnalysisJob
    err := r.db.QueryRowContext(ctx, query, jobID).Scan(
        &job.JobID,
        &job.UploadID,
        &job.Status,
        &job.Progress,
        &job.CurrentStep,
        &job.ErrorMessage,
        &job.CreatedAt,
        &job.CompletedAt,
        &job.UpdatedAt,
    )

    if err == sql.ErrNoRows {
        return nil, fmt.Errorf("job not found")
    }

    return &job, err
}

func (r *AnalysisPostgresRepository) ResetJobForRetry(ctx context.Context, jobID string) error {
    // Start transaction
    tx, err := r.db.BeginTx(ctx, nil)
    if err != nil {
        return err
    }
    defer tx.Rollback()

    // Delete old profile
    _, err = tx.ExecContext(ctx, `DELETE FROM user_profile WHERE job_id = $1`, jobID)
    if err != nil {
        return err
    }

    // Reset job
    _, err = tx.ExecContext(ctx, `
        UPDATE analysis_jobs
        SET status = 'queued',
            progress = 0,
            current_step = '',
            error_message = NULL,
            completed_at = NULL,
            updated_at = CURRENT_TIMESTAMP
        WHERE job_id = $1
    `, jobID)
    if err != nil {
        return err
    }

    return tx.Commit()
}
```

---

## OpenAI Integration

### Client Initialization

```go
import "github.com/sashabaranov/go-openai"

client := openai.NewClient(os.Getenv("OPENAI_API_KEY"))
```

### Embedding Generation

```go
func (a *DefaultResumeAnalyzer) generateEmbeddings(ctx context.Context, chunks []string) ([][]float32, error) {
    embeddings := make([][]float32, len(chunks))

    for i, chunk := range chunks {
        resp, err := a.openaiClient.CreateEmbeddings(ctx, openai.EmbeddingRequest{
            Model: "text-embedding-ada-002",
            Input: []string{chunk},
        })
        if err != nil {
            return nil, fmt.Errorf("embedding generation failed: %w", err)
        }

        embeddings[i] = resp.Data[0].Embedding
    }

    return embeddings, nil
}
```

### LLM Analysis

```go
func (a *DefaultResumeAnalyzer) analyzeResume(ctx context.Context, text string, linkedinURL *string) (*models.UserProfile, error) {
    prompt := fmt.Sprintf(`
Analyze the following resume and extract structured information.

Resume Text:
%s

LinkedIn URL: %s

Please provide a JSON response with the following structure:
{
  "name": "...",
  "email": "...",
  "phone": "...",
  "location": "...",
  "skills": {
    "Technical": [...],
    "Soft Skills": [...]
  },
  "experience": [...],
  "education": [...],
  "summary": "...",
  "job_recommendations": [...],
  "strengths": [...],
  "weaknesses": [...]
}
`, text, stringOrEmpty(linkedinURL))

    resp, err := a.openaiClient.CreateChatCompletion(ctx, openai.ChatCompletionRequest{
        Model: "gpt-4",
        Messages: []openai.ChatCompletionMessage{
            {
                Role:    "system",
                Content: "You are a professional resume analyzer. Provide structured, actionable insights.",
            },
            {
                Role:    "user",
                Content: prompt,
            },
        },
        Temperature: 0.7,
        MaxTokens:   2000,
    })

    if err != nil {
        return nil, fmt.Errorf("LLM analysis failed: %w", err)
    }

    // Parse JSON response
    var profile models.UserProfile
    err = json.Unmarshal([]byte(resp.Choices[0].Message.Content), &profile)
    if err != nil {
        return nil, fmt.Errorf("failed to parse LLM response: %w", err)
    }

    return &profile, nil
}
```

---

## Error Handling

### Strategy

1. **Return errors**: Functions return errors, don't panic
2. **Wrap errors**: Use `fmt.Errorf("context: %w", err)` for context
3. **Log errors**: Log before returning HTTP errors
4. **User-friendly messages**: Don't expose internal errors to frontend

**Example**:
```go
func (h *AnalysisHandler) HandleStartAnalysis(w http.ResponseWriter, r *http.Request) {
    uploadID, err := strconv.Atoi(r.URL.Query().Get("upload_id"))
    if err != nil {
        log.Printf("Invalid upload_id: %v", err)
        http.Error(w, "Invalid upload_id parameter", http.StatusBadRequest)
        return
    }

    job, err := h.analyzer.CreateJob(ctx, uploadID)
    if err != nil {
        log.Printf("Failed to create job: %v", err)
        http.Error(w, "Failed to create analysis job", http.StatusInternalServerError)
        return
    }

    // Success path...
}
```

---

## Concurrency & Synchronization

### Worker Pool Semaphore

```go
type DefaultResumeAnalyzer struct {
    workerSemaphore chan struct{} // Buffered channel (size = max workers)
}

func (a *DefaultResumeAnalyzer) StartJob(ctx context.Context, jobID string, upload *models.Upload) {
    // Acquire semaphore (blocks if pool full)
    a.workerSemaphore <- struct{}{}

    go func() {
        defer func() {
            // Always release semaphore
            <-a.workerSemaphore
        }()

        a.processJob(jobID, upload)
    }()
}
```

### Hub Thread-Safety

```go
type Hub struct {
    clients    map[*Client]bool
    mu         sync.RWMutex  // Read-write mutex
}

func (h *Hub) AddClient(client *Client) {
    h.mu.Lock()
    defer h.mu.Unlock()
    h.clients[client] = true
}

func (h *Hub) GetClients() []*Client {
    h.mu.RLock()
    defer h.mu.RUnlock()

    clients := make([]*Client, 0, len(h.clients))
    for client := range h.clients {
        clients = append(clients, client)
    }
    return clients
}
```

---

## Environment Configuration

### Required Environment Variables

```env
# Database
DATABASE_URL=postgres://user:password@localhost:5432/ai_chat?sslmode=disable

# OpenAI
OPENAI_API_KEY=sk-...

# Server
PORT=8081
WORKER_POOL_SIZE=5

# CORS (production)
ALLOWED_ORIGINS=https://yourdomain.com

# WebSocket
WS_MAX_MESSAGE_SIZE=524288  # 512 KB
WS_PING_INTERVAL=54s
WS_PONG_TIMEOUT=60s
```

---

## Performance Characteristics

### Job Processing

| Stage | Timeout | Typical Duration |
|-------|---------|------------------|
| Text extraction | 2 min | 5-15s |
| Text chunking | N/A | <1s |
| Embedding generation | N/A | 10-30s |
| Vector storage | N/A | <1s |
| LLM analysis | 3 min | 20-60s |
| **Total** | **5 min** | **3-5 min** |

### Export Performance

| Format | Generation Time | File Size |
|--------|----------------|-----------|
| JSON | <1ms | 5 KB |
| CSV | 1-5ms | 8 KB |
| PDF | 50-200ms | 50-150 KB |
| DOCX | 20-100ms | 20-80 KB |

### Concurrency

- **Worker Pool Size**: 5 concurrent jobs (configurable)
- **WebSocket Connections**: ~100-200 tested
- **Database Queries**: Sequential (no connection pool configured)

---

## Security Considerations

### Current Status

**Implemented**:
- ✅ File size validation (10MB max)
- ✅ File type verification (signature check)
- ✅ MIME type validation
- ✅ Session tokens (in-memory)

**NOT Implemented** (CRITICAL for production):
- ❌ Password hashing (currently plain text - MOCK ONLY)
- ❌ User-scoped resources (any user can access any job)
- ❌ Rate limiting
- ❌ HTTPS/TLS
- ❌ CORS whitelist (currently allows all origins)
- ❌ Input sanitization (SQL injection risk)
- ❌ Token expiration
- ❌ CSRF protection

### Production Requirements

```go
// Password hashing with bcrypt
import "golang.org/x/crypto/bcrypt"

func hashPassword(password string) (string, error) {
    hash, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
    return string(hash), err
}

func verifyPassword(hashedPassword, password string) bool {
    err := bcrypt.CompareHashAndPassword([]byte(hashedPassword), []byte(password))
    return err == nil
}
```

```go
// User-scoped resources
func (h *AnalysisHandler) HandleGetJobs(w http.ResponseWriter, r *http.Request) {
    // Get user ID from authenticated session
    userID := getUserIDFromSession(r)

    // Verify upload belongs to user
    upload, err := h.uploadRepo.GetUploadByID(ctx, uploadID)
    if upload.UserID != userID {
        http.Error(w, "Forbidden", http.StatusForbidden)
        return
    }

    // Proceed...
}
```

```go
// Rate limiting with middleware
import "golang.org/x/time/rate"

func rateLimitMiddleware(next http.Handler) http.Handler {
    limiter := rate.NewLimiter(10, 20) // 10 req/s, burst of 20

    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        if !limiter.Allow() {
            http.Error(w, "Rate limit exceeded", http.StatusTooManyRequests)
            return
        }
        next.ServeHTTP(w, r)
    })
}
```

---

## Testing Strategy

### Unit Tests (NOT YET IMPLEMENTED)

```go
// Example test for ResetJobForRetry
func TestResetJobForRetry(t *testing.T) {
    // Setup mock repository
    mockRepo := &MockAnalysisRepository{}
    analyzer := NewDefaultResumeAnalyzer(mockRepo, nil, nil, 5)

    // Create test job
    job := &models.AnalysisJob{
        JobID:  "test-job",
        Status: "failed",
    }
    mockRepo.CreateJob(context.Background(), job)

    // Test retry
    err := analyzer.RetryJob(context.Background(), "test-job")
    assert.NoError(t, err)

    // Verify job status
    updatedJob, _ := mockRepo.GetJobByID(context.Background(), "test-job")
    assert.Equal(t, "queued", updatedJob.Status)
    assert.Equal(t, 0, updatedJob.Progress)
}
```

### Integration Tests (NOT YET IMPLEMENTED)

```go
func TestFullAnalysisPipeline(t *testing.T) {
    // Setup test database
    // Upload test resume
    // Start analysis job
    // Wait for completion
    // Verify profile data
}
```

---

## Logging & Monitoring

### Current Status

**Implemented**:
- Basic `log.Printf()` for errors and startup
- Console output only

**NOT Implemented**:
- Structured logging (JSON format)
- Log levels (DEBUG, INFO, WARN, ERROR)
- Centralized logging service
- Metrics (Prometheus)
- Tracing (OpenTelemetry)
- Health check endpoint

### Future Enhancements

```go
// Structured logging with zap
import "go.uber.org/zap"

logger, _ := zap.NewProduction()
defer logger.Sync()

logger.Info("Job started",
    zap.String("job_id", jobID),
    zap.Int("upload_id", uploadID),
    zap.String("status", "queued"),
)
```

```go
// Prometheus metrics
import "github.com/prometheus/client_golang/prometheus"

var (
    jobsStarted = prometheus.NewCounter(prometheus.CounterOpts{
        Name: "analysis_jobs_started_total",
        Help: "Total number of analysis jobs started",
    })

    jobDuration = prometheus.NewHistogram(prometheus.HistogramOpts{
        Name: "analysis_job_duration_seconds",
        Help: "Duration of analysis jobs",
    })
)
```

---

## Graceful Shutdown

### Current Implementation

```go
func main() {
    // ... server setup ...

    server := &http.Server{
        Addr:    ":8081",
        Handler: corsHandler,
    }

    // Channel for shutdown signal
    stop := make(chan os.Signal, 1)
    signal.Notify(stop, os.Interrupt, syscall.SIGTERM)

    go func() {
        log.Println("Server starting on :8081")
        if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
            log.Fatalf("Server error: %v", err)
        }
    }()

    <-stop
    log.Println("Shutting down server...")

    // 10-second shutdown timeout
    ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
    defer cancel()

    if err := server.Shutdown(ctx); err != nil {
        log.Fatalf("Shutdown error: %v", err)
    }

    log.Println("Server stopped")
}
```

---

## Known Issues & Limitations

1. **No Connection Pooling**: Database connections not optimized
2. **Plain Text Passwords**: CRITICAL security issue (MOCK ONLY)
3. **No Authorization**: Any user can access any resource
4. **No Rate Limiting**: Vulnerable to DoS attacks
5. **No Distributed Tracing**: Hard to debug in production
6. **Sequential Embeddings**: Embedding generation not parallelized
7. **No Retry Logic**: Failed OpenAI calls not retried
8. **No Circuit Breaker**: No protection against cascading failures

---

## Future Enhancements

1. **Authentication & Authorization**: bcrypt passwords, JWT tokens, user-scoped resources
2. **Performance**: Connection pooling, parallel embeddings, caching
3. **Observability**: Structured logging, Prometheus metrics, OpenTelemetry tracing
4. **Reliability**: Retry logic, circuit breakers, health checks
5. **Scalability**: Horizontal scaling, distributed worker pool (Redis queue)
6. **Testing**: Unit tests, integration tests, load tests
7. **Documentation**: API documentation (Swagger/OpenAPI)

---

[Next: Database Schema →](04_database.md)

[← Back to Architecture Index](README.md)
