package analyzer

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"strings"

	"github.com/tmc/langchaingo/llms"
	"github.com/tmc/langchaingo/llms/openai"
	"github.com/your-org/websocket-server/pkg/models"
)

// ExternalLLMClient implements LLMClient interface using OpenAI via LangChain
type ExternalLLMClient struct {
	llm   llms.Model
	model string
}

// NewExternalLLMClient creates a new OpenAI LLM client using LangChain
func NewExternalLLMClient(apiKey, apiURL, model string) (LLMClient, error) {
	if apiKey == "" {
		return nil, fmt.Errorf("API key is required")
	}

	if model == "" {
		model = "gpt-4" // Default model
	}

	// Create OpenAI client with LangChain
	opts := []openai.Option{
		openai.WithToken(apiKey),
		openai.WithModel(model),
	}

	// If custom API URL is provided, use it
	if apiURL != "" && apiURL != "https://api.openai.com/v1" {
		opts = append(opts, openai.WithBaseURL(apiURL))
	}

	llm, err := openai.New(opts...)
	if err != nil {
		return nil, fmt.Errorf("failed to create OpenAI client: %w", err)
	}

	return &ExternalLLMClient{
		llm:   llm,
		model: model,
	}, nil
}

// Analyze sends resume text and retrieved context to the LLM for analysis
func (l *ExternalLLMClient) Analyze(ctx context.Context, request *AnalysisRequest) (*AnalysisResponse, error) {
	// Build the prompt
	prompt := buildAnalysisPrompt(request)

	log.Printf("Calling OpenAI LLM for resume analysis...")

	// Call the LLM
	response, err := llms.GenerateFromSinglePrompt(ctx, l.llm, prompt)
	if err != nil {
		return nil, fmt.Errorf("failed to generate LLM response: %w", err)
	}

	log.Printf("Received LLM response, parsing JSON...")

	// Parse the JSON response
	analysisResponse, err := parseAnalysisResponse(response)
	if err != nil {
		return nil, fmt.Errorf("failed to parse LLM response: %w", err)
	}

	return analysisResponse, nil
}

// GenerateFromPrompt sends a raw prompt to the LLM without any wrapper
func (l *ExternalLLMClient) GenerateFromPrompt(ctx context.Context, prompt string) (string, error) {
	log.Printf("Calling OpenAI LLM with custom prompt...")

	// Call the LLM directly with the provided prompt
	response, err := llms.GenerateFromSinglePrompt(ctx, l.llm, prompt)
	if err != nil {
		return "", fmt.Errorf("failed to generate LLM response: %w", err)
	}

	log.Printf("Received LLM response (%d chars)", len(response))
	return response, nil
}

// parseAnalysisResponse parses the JSON response from the LLM
func parseAnalysisResponse(jsonStr string) (*AnalysisResponse, error) {
	// Clean the response - sometimes LLMs wrap JSON in markdown code blocks
	jsonStr = strings.TrimSpace(jsonStr)
	jsonStr = strings.TrimPrefix(jsonStr, "```json")
	jsonStr = strings.TrimPrefix(jsonStr, "```")
	jsonStr = strings.TrimSuffix(jsonStr, "```")
	jsonStr = strings.TrimSpace(jsonStr)

	// Parse JSON
	var result struct {
		Name           *string                  `json:"name"`
		Email          *string                  `json:"email"`
		Phone          *string                  `json:"phone"`
		LinkedInURL    *string                  `json:"linkedin_url"`
		Age            *int                     `json:"age"`
		Race           *string                  `json:"race"`
		Location       *string                  `json:"location"`
		TotalWorkYears *float64                 `json:"total_work_years"`
		Skills         map[string][]string      `json:"skills"`
		Experience     []models.ExperienceEntry `json:"experience"`
		Education      []models.EducationEntry  `json:"education"`
		Summary        *string                  `json:"summary"`
		JobRecommendations []string             `json:"job_recommendations"`
		Strengths      []string                 `json:"strengths"`
		Weaknesses     []string                 `json:"weaknesses"`
	}

	if err := json.Unmarshal([]byte(jsonStr), &result); err != nil {
		// Log the raw response for debugging
		log.Printf("Failed to parse JSON. Raw response: %s", jsonStr[:min(500, len(jsonStr))])
		return nil, fmt.Errorf("failed to unmarshal JSON: %w", err)
	}

	return &AnalysisResponse{
		Name:               result.Name,
		Email:              result.Email,
		Phone:              result.Phone,
		LinkedInURL:        result.LinkedInURL,
		Age:                result.Age,
		Race:               result.Race,
		Location:           result.Location,
		TotalWorkYears:     result.TotalWorkYears,
		Skills:             result.Skills,
		Experience:         result.Experience,
		Education:          result.Education,
		Summary:            result.Summary,
		JobRecommendations: result.JobRecommendations,
		Strengths:          result.Strengths,
		Weaknesses:         result.Weaknesses,
	}, nil
}

// buildAnalysisPrompt constructs the prompt for the LLM
func buildAnalysisPrompt(request *AnalysisRequest) string {
	var prompt strings.Builder

	prompt.WriteString("You are a professional resume analyzer. Analyze the following resume and extract structured information.\n\n")

	prompt.WriteString("Resume Text:\n")
	prompt.WriteString(request.ResumeText)
	prompt.WriteString("\n\n")

	if len(request.RetrievedChunks) > 0 {
		prompt.WriteString("Relevant Context from Vector Search:\n")
		for i, chunk := range request.RetrievedChunks {
			prompt.WriteString(fmt.Sprintf("Chunk %d: %s\n", i+1, chunk))
		}
		prompt.WriteString("\n")
	}

	if request.LinkedInURL != nil && *request.LinkedInURL != "" {
		prompt.WriteString(fmt.Sprintf("LinkedIn Profile: %s\n\n", *request.LinkedInURL))
	}

	prompt.WriteString(`Please extract and structure the following information in JSON format:
{
  "name": "<full name or null>",
  "email": "<email address or null>",
  "phone": "<phone number or null>",
  "linkedin_url": "<LinkedIn profile URL or null>",
  "age": <integer or null>,
  "race": "<string or null>",
  "location": "<string or null>",
  "total_work_years": <number or null>,
  "skills": {
    "technical": ["skill1", "skill2", ...],
    "soft": ["skill1", "skill2", ...]
  },
  "experience": [
    {
      "company": "Company Name",
      "role": "Job Title",
      "start_date": "YYYY-MM or YYYY",
      "end_date": "YYYY-MM or YYYY or 'Present'",
      "years": <float>,
      "description": "Brief description"
    }
  ],
  "education": [
    {
      "degree": "Degree Name",
      "institution": "School Name",
      "year": <integer or null>
    }
  ],
  "summary": "Executive summary of the candidate's profile",
  "job_recommendations": ["Recommended Role 1", "Recommended Role 2", ...],
  "strengths": ["Strength 1", "Strength 2", ...],
  "weaknesses": ["Area for improvement 1", "Area for improvement 2", ...]
}

Important notes:
- Extract ONLY information that is explicitly stated in the resume
- Do NOT infer or guess age or race unless explicitly stated
- For location: If location is explicitly stated, use it. If not but phone number is present, infer the country/region from the phone number's country code and area code (e.g., +1 619 = San Diego, CA, United States; +86 = China; +44 = United Kingdom)
- For skills, extract ALL technical skills mentioned (programming languages, frameworks, tools, etc.)
- Include exact company names, dates, and descriptions from the resume
- Total work years should be calculated from all work experiences
- Be accurate and comprehensive in your analysis
- Job recommendations should be based on actual skills and experience from the resume
`)

	return prompt.String()
}

// PlaceholderLLMClient is a placeholder implementation for testing
type PlaceholderLLMClient struct{}

// NewPlaceholderLLMClient creates a placeholder LLM client
func NewPlaceholderLLMClient() LLMClient {
	return &PlaceholderLLMClient{}
}

// Analyze returns placeholder analysis results
func (l *PlaceholderLLMClient) Analyze(ctx context.Context, request *AnalysisRequest) (*AnalysisResponse, error) {
	// Return placeholder data for testing
	age := 28
	race := "Not specified"
	location := "San Francisco, CA"
	workYears := 5.0
	summary := "Experienced software engineer with strong background in full-stack development. Proficient in multiple programming languages and frameworks. Demonstrated ability to lead projects and work in agile teams."

	response := &AnalysisResponse{
		Age:            &age,
		Race:           &race,
		Location:       &location,
		TotalWorkYears: &workYears,
		Skills: map[string][]string{
			"technical": {"Go", "React", "Python", "PostgreSQL", "Docker", "Kubernetes"},
			"soft":      {"Leadership", "Communication", "Problem Solving", "Team Collaboration"},
		},
		Experience: []models.ExperienceEntry{
			{
				Company:     "Tech Corp",
				Role:        "Senior Software Engineer",
				Years:       3.0,
				Description: "Led development of microservices architecture",
			},
			{
				Company:     "StartupXYZ",
				Role:        "Software Engineer",
				Years:       2.0,
				Description: "Full-stack development with React and Node.js",
			},
		},
		Education: []models.EducationEntry{
			{
				Degree:      "BS Computer Science",
				Institution: "University of California",
				Year:        func() *int { y := 2019; return &y }(),
			},
		},
		Summary:            &summary,
		JobRecommendations: []string{"Tech Lead", "Senior Full Stack Engineer", "Engineering Manager"},
		Strengths:          []string{"Strong technical skills", "Experience with modern tech stack", "Leadership capabilities"},
		Weaknesses:         []string{"Limited cloud architecture experience", "No formal certifications mentioned"},
	}

	return response, nil
}

// GenerateFromPrompt returns placeholder response for testing
func (l *PlaceholderLLMClient) GenerateFromPrompt(ctx context.Context, prompt string) (string, error) {
	// Return placeholder interview questions JSON
	placeholderResponse := `{
  "questions": [
    {
      "question": "Can you describe your experience with microservices architecture?",
      "category": "Technical",
      "difficulty": "Medium"
    },
    {
      "question": "How do you handle debugging in production environments?",
      "category": "Technical",
      "difficulty": "Medium"
    },
    {
      "question": "Tell me about a time when you had to work with a difficult team member.",
      "category": "Behavioral",
      "difficulty": "Medium"
    }
  ]
}`
	return placeholderResponse, nil
}
