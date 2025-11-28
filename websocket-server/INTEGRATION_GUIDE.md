# LLM API Integration Guide

This guide explains how to integrate your external LLM API into the resume analysis system.

## Overview

The system is ready to accept your external LLM API. You need to implement the LLM client interface located in `internal/analyzer/llm.go`.

## Current Status

- ✅ Text extraction (PDF/DOCX)
- ✅ Text chunking
- ✅ Embeddings generation interface (placeholder active)
- ✅ Vector storage interface (placeholder active)
- ⏳ **LLM Analysis** - Ready for your API integration
- ✅ Async job processing
- ✅ Progress tracking
- ✅ Database storage

## Integration Steps

### 1. Implement the LLM Client

Edit `internal/analyzer/llm.go` and replace the placeholder with your API:

```go
func (l *ExternalLLMClient) Analyze(ctx context.Context, request *AnalysisRequest) (*AnalysisResponse, error) {
    // Build the prompt
    prompt := buildAnalysisPrompt(request)

    // TODO: Replace this with your actual LLM API call
    // Example:
    // response, err := yourLLMClient.Complete(ctx, YourLLMRequest{
    //     Prompt: prompt,
    //     Model: l.model,
    //     Temperature: 0.7,
    // })
    //
    // Parse the response and extract structured data
    // Return &AnalysisResponse{...}

    return nil, fmt.Errorf("external LLM API not yet implemented")
}
```

### 2. Update main.go

In `cmd/server/main.go`, replace the placeholder LLM client:

```go
// Current (placeholder):
llmClient := analyzer.NewPlaceholderLLMClient()

// Replace with your API:
llmClient, err := analyzer.NewExternalLLMClient(
    os.Getenv("LLM_API_KEY"),
    os.Getenv("LLM_API_URL"),
    os.Getenv("LLM_MODEL"),
)
if err != nil {
    log.Fatalf("Failed to initialize LLM client: %v", err)
}
```

### 3. Add Environment Variables

Add these to your environment or `.env` file:

```bash
# LLM Configuration
LLM_API_KEY=your_api_key_here
LLM_API_URL=https://your-llm-api.com/v1/completions
LLM_MODEL=your-model-name
```

### 4. Expected Response Format

Your LLM should return structured data matching the `AnalysisResponse` struct:

```json
{
  "age": 28,
  "race": "Not specified",
  "location": "San Francisco, CA",
  "total_work_years": 5,
  "skills": {
    "technical": ["Go", "Python", "React", "PostgreSQL"],
    "soft": ["Leadership", "Communication", "Problem Solving"]
  },
  "experience": [
    {
      "company": "TechCorp",
      "role": "Senior Engineer",
      "years": 3.0,
      "description": "Led development of microservices"
    }
  ],
  "education": [
    {
      "degree": "BS Computer Science",
      "institution": "University Name",
      "year": 2019
    }
  ],
  "summary": "Experienced software engineer with strong full-stack skills...",
  "job_recommendations": ["Tech Lead", "Senior Full Stack Engineer"],
  "strengths": ["Strong technical skills", "Leadership experience"],
  "weaknesses": ["Limited cloud architecture experience"]
}
```

### 5. Prompt Engineering

The system provides a pre-built prompt in `buildAnalysisPrompt()` that includes:
- Full resume text
- Retrieved context from vector search (if available)
- LinkedIn URL (if provided)
- Structured output format instructions

You can customize this prompt to match your LLM's requirements.

## Optional: Enable Real Embeddings

### OpenAI Embeddings (Example)

In `cmd/server/main.go`:

```go
// Current (placeholder):
embedder := analyzer.NewPlaceholderEmbeddingGenerator()

// Replace with OpenAI:
embedder, err := analyzer.NewEmbeddingGenerator(os.Getenv("OPENAI_API_KEY"))
if err != nil {
    log.Printf("Warning: Failed to initialize embeddings: %v", err)
    embedder = analyzer.NewPlaceholderEmbeddingGenerator()
}
```

Add environment variable:
```bash
OPENAI_API_KEY=sk-...
```

## Optional: Enable ChromaDB Vector Storage

The ChromaDB Go client API needs to be completed. For now, the placeholder vector store is used, which stores embeddings in memory.

To enable real ChromaDB:
1. Update `internal/analyzer/vectorstore.go` with the correct ChromaDB Go client API calls
2. Ensure ChromaDB is running: `./start-chroma.sh`
3. Update `cmd/server/main.go` to use real ChromaDB instead of placeholder

## Testing Your Integration

### 1. Start the services:

```bash
# Terminal 1: PostgreSQL (should already be running)
sudo systemctl status postgresql

# Terminal 2: ChromaDB (optional)
./start-chroma.sh

# Terminal 3: Go server
./bin/server
```

### 2. Upload a test resume:

```bash
curl -X POST http://localhost:8081/api/upload \
  -F "resume=@test_resume.pdf" \
  -F "linkedin_url=https://linkedin.com/in/test"
```

### 3. Start analysis:

```bash
curl -X POST "http://localhost:8081/api/analyze?id=1"
```

### 4. Check progress:

```bash
curl "http://localhost:8081/api/analysis/status?job_id=job_xxx"
```

### 5. Get results:

```bash
curl "http://localhost:8081/api/analysis/result?job_id=job_xxx"
```

## Troubleshooting

### Common Issues

1. **"external LLM API not yet implemented"**
   - You're still using the placeholder. Implement the LLM client as described above.

2. **Slow analysis**
   - Check your LLM API response times
   - Consider implementing timeout handling
   - Monitor the database for job status updates

3. **Missing fields in results**
   - Ensure your LLM returns all required fields
   - Check the prompt engineering - you may need to adjust for your LLM
   - Review logs for parsing errors

4. **Database errors**
   - Verify PostgreSQL is running: `sudo systemctl status postgresql`
   - Check database permissions: `psql -U chatapp -d chatapp_db -c "\dt"`
   - Review migration: `cat db/migrations/002_analysis_tables.sql`

## Support

For issues or questions:
1. Check the logs: The Go server outputs detailed logs for each analysis step
2. Review the database: `SELECT * FROM analysis_jobs ORDER BY created_at DESC LIMIT 5;`
3. Test individual components in isolation

## Next Steps

After integration:
1. Test with various resume formats (PDF, DOCX)
2. Validate analysis quality
3. Fine-tune prompts for your specific LLM
4. Add rate limiting if needed
5. Monitor API costs
6. Implement caching if beneficial
