package handler

import (
	"context"
	"encoding/json"
	"log"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/your-org/websocket-server/internal/analyzer"
	"github.com/your-org/websocket-server/internal/qamatcher"
	"github.com/your-org/websocket-server/internal/repository"
	"github.com/your-org/websocket-server/pkg/models"
)

// InterviewHandler handles interview preparation requests
type InterviewHandler struct {
	llmClient            analyzer.LLMClient
	analysisRepo         repository.AnalysisRepository
	savedQuestionRepo    repository.SavedQuestionRepository
	embedder             analyzer.EmbeddingGenerator
}

// NewInterviewHandler creates a new interview handler instance
func NewInterviewHandler(llmClient analyzer.LLMClient, analysisRepo repository.AnalysisRepository, savedQuestionRepo repository.SavedQuestionRepository, embedder analyzer.EmbeddingGenerator) *InterviewHandler {
	return &InterviewHandler{
		llmClient:         llmClient,
		analysisRepo:      analysisRepo,
		savedQuestionRepo: savedQuestionRepo,
		embedder:          embedder,
	}
}

// InterviewRequest represents the request to generate interview questions
type InterviewRequest struct {
	JobID          string `json:"job_id"`
	JobTitle       string `json:"job_title"`
	Level          string `json:"level"`
	TargetCompany  string `json:"target_company"`
	JobDescription string `json:"job_description"`
	JobRequirements string `json:"job_requirements"`
}

// InterviewQuestion represents a generated interview question
type InterviewQuestion struct {
	ID         string   `json:"id"`         // Unique identifier for the question
	Question   string   `json:"question"`
	Category   string   `json:"category"`
	Difficulty string   `json:"difficulty"`
	Tags       []string `json:"tags"`       // Keywords extracted from the question
	Answer     string   `json:"answer"`     // Personalized answer for the candidate
}

// InterviewResponse represents the response with generated questions
type InterviewResponse struct {
	Questions []InterviewQuestion `json:"questions"`
}

// RegenerateAnswerRequest represents the request to regenerate an answer
type RegenerateAnswerRequest struct {
	JobID    string `json:"job_id"`
	Question string `json:"question"`
	Category string `json:"category"`
}

// RegenerateAnswerResponse represents the response with a new answer
type RegenerateAnswerResponse struct {
	Answer string `json:"answer"`
}

// HandleGenerateQuestions generates interview questions based on user profile and job details
func (h *InterviewHandler) HandleGenerateQuestions(w http.ResponseWriter, r *http.Request) {
	// Only allow POST requests
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Parse request body
	var req InterviewRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondJSON(w, http.StatusBadRequest, map[string]string{"error": "Invalid request body"})
		return
	}

	// Validate required fields
	if req.JobID == "" || req.JobTitle == "" || req.JobRequirements == "" {
		respondJSON(w, http.StatusBadRequest, map[string]string{"error": "Missing required fields: job_id, job_title, job_requirements"})
		return
	}

	ctx, cancel := context.WithTimeout(r.Context(), 150*time.Second) // 2.5 minutes for generating 10 questions with answers
	defer cancel()

	// Get user profile from database
	profile, err := h.analysisRepo.GetProfileByJobID(ctx, req.JobID)
	if err != nil {
		log.Printf("Error getting profile for job %s: %v", req.JobID, err)
		respondJSON(w, http.StatusNotFound, map[string]string{"error": "Profile not found"})
		return
	}

	// Generate interview questions using LLM
	questions, err := h.generateInterviewQuestions(ctx, profile, &req)
	if err != nil {
		log.Printf("Error generating interview questions: %v", err)
		respondJSON(w, http.StatusInternalServerError, map[string]string{"error": "Failed to generate interview questions"})
		return
	}

	// Return questions
	respondJSON(w, http.StatusOK, InterviewResponse{Questions: questions})
	log.Printf("Generated %d interview questions for job %s", len(questions), req.JobID)
}

// generateInterviewQuestions uses LLM to generate interview questions
func (h *InterviewHandler) generateInterviewQuestions(ctx context.Context, profile interface{}, req *InterviewRequest) ([]InterviewQuestion, error) {
	// Build prompt for LLM
	prompt := h.buildInterviewPrompt(profile, req)

	// Call LLM with the raw prompt (no resume analysis wrapper)
	response, err := h.llmClient.GenerateFromPrompt(ctx, prompt)
	if err != nil {
		return nil, err
	}

	// Parse the response to extract questions
	questions := h.parseQuestionsFromLLMResponse(response)

	return questions, nil
}

// buildInterviewPrompt constructs the prompt for generating interview questions
func (h *InterviewHandler) buildInterviewPrompt(profile interface{}, req *InterviewRequest) string {
	// Convert profile to JSON for inclusion in prompt
	profileJSON, _ := json.MarshalIndent(profile, "", "  ")

	prompt := "You are an expert technical interviewer and career coach. Based on the candidate's profile and the job details provided, generate exactly 10 interview questions that might be asked in the interview.\n\n"

	prompt += "Candidate Profile:\n"
	prompt += string(profileJSON)
	prompt += "\n\n"

	prompt += "Job Details:\n"
	prompt += "Job Title: " + req.JobTitle + "\n"
	prompt += "Level: " + req.Level + "\n"

	if req.TargetCompany != "" {
		prompt += "Target Company: " + req.TargetCompany + "\n"
	}

	if req.JobDescription != "" {
		prompt += "\nJob Description:\n" + req.JobDescription + "\n"
	}

	prompt += "\nJob Requirements:\n" + req.JobRequirements + "\n\n"

	prompt += `Generate exactly 10 interview questions with personalized answers in JSON format. Mix technical, behavioral, and situational questions based on:
1. The candidate's background and experience
2. The job requirements and level
3. Common interview questions for this type of role

Return ONLY a JSON object with this exact structure (no additional text):
{
  "questions": [
    {
      "id": "q1",
      "question": "Question text here",
      "category": "Technical|Behavioral|Situational|Problem-Solving",
      "difficulty": "Easy|Medium|Hard",
      "tags": ["keyword1", "keyword2", "keyword3"],
      "answer": "Personalized answer based on candidate's profile"
    }
  ]
}

Important Instructions:
- Generate EXACTLY 10 questions
- For each question, generate an ID (q1, q2, q3, etc.)
- Extract 3-5 relevant keywords from each question as tags (lowercase, single words or short phrases)
- Include the category and difficulty as tags as well (e.g., ["technical", "medium", "python", "backend", "databases"])
- For the answer field: Write a personalized, strong answer that the candidate could use, incorporating their actual experience, projects, and skills from their profile
- The answer should be 2-4 paragraphs, specific to the candidate's background
- Use real examples from their resume/profile in the answers
- Questions should be relevant to both the candidate's profile and the job requirements
- Balance technical and behavioral questions appropriately for the level
- Consider the candidate's strengths and potential gaps
- Return ONLY the JSON, no markdown formatting or additional text`

	return prompt
}

// parseQuestionsFromLLMResponse parses interview questions from raw LLM response string
func (h *InterviewHandler) parseQuestionsFromLLMResponse(response string) []InterviewQuestion {
	// Try to parse the response as JSON
	var result struct {
		Questions []InterviewQuestion `json:"questions"`
	}

	// Clean the response (remove markdown code blocks if present)
	jsonStr := response

	// Remove markdown code block markers
	if len(jsonStr) > 0 && jsonStr[0] == '`' {
		start := 0
		end := len(jsonStr)

		// Find start of JSON
		for i := 0; i < len(jsonStr); i++ {
			if jsonStr[i] == '{' {
				start = i
				break
			}
		}

		// Find end of JSON
		for i := len(jsonStr) - 1; i >= 0; i-- {
			if jsonStr[i] == '}' {
				end = i + 1
				break
			}
		}

		jsonStr = jsonStr[start:end]
	}

	if err := json.Unmarshal([]byte(jsonStr), &result); err != nil {
		log.Printf("Failed to parse interview questions JSON: %v. Response: %s", err, jsonStr)
		// Return empty array on parse failure
		return []InterviewQuestion{}
	}

	return result.Questions
}

// HandleRegenerateAnswer regenerates a single answer for a specific question
func (h *InterviewHandler) HandleRegenerateAnswer(w http.ResponseWriter, r *http.Request) {
	// Only allow POST requests
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Parse request body
	var req RegenerateAnswerRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondJSON(w, http.StatusBadRequest, map[string]string{"error": "Invalid request body"})
		return
	}

	// Validate required fields
	if req.JobID == "" || req.Question == "" {
		respondJSON(w, http.StatusBadRequest, map[string]string{"error": "Missing required fields: job_id, question"})
		return
	}

	ctx, cancel := context.WithTimeout(r.Context(), 30*time.Second)
	defer cancel()

	// Get user profile from database
	profile, err := h.analysisRepo.GetProfileByJobID(ctx, req.JobID)
	if err != nil {
		log.Printf("Error getting profile for job %s: %v", req.JobID, err)
		respondJSON(w, http.StatusNotFound, map[string]string{"error": "Profile not found"})
		return
	}

	// Generate new answer using LLM
	answer, err := h.generateSingleAnswer(ctx, profile, req.Question, req.Category)
	if err != nil {
		log.Printf("Error regenerating answer: %v", err)
		respondJSON(w, http.StatusInternalServerError, map[string]string{"error": "Failed to regenerate answer"})
		return
	}

	// Return new answer
	respondJSON(w, http.StatusOK, RegenerateAnswerResponse{Answer: answer})
	log.Printf("Regenerated answer for question in job %s", req.JobID)
}

// generateSingleAnswer generates a personalized answer for a single question
func (h *InterviewHandler) generateSingleAnswer(ctx context.Context, profile interface{}, question string, category string) (string, error) {
	// Convert profile to JSON for inclusion in prompt
	profileJSON, _ := json.MarshalIndent(profile, "", "  ")

	prompt := "You are an expert career coach helping a candidate prepare for interviews.\n\n"
	prompt += "Candidate Profile:\n"
	prompt += string(profileJSON)
	prompt += "\n\n"
	prompt += "Interview Question:\n"
	prompt += question + "\n\n"
	if category != "" {
		prompt += "Question Category: " + category + "\n\n"
	}

	prompt += `Generate a strong, personalized answer that the candidate could use for this interview question.

Requirements:
- Write 2-4 paragraphs
- Use specific examples from the candidate's actual experience, projects, and skills
- Make it sound natural and conversational, not overly formal
- Incorporate real details from their profile (companies, technologies, projects, etc.)
- Show both technical depth and soft skills where appropriate
- Make the candidate sound confident but not arrogant

Return ONLY the answer text, no additional commentary or JSON formatting.`

	// Call LLM with the prompt
	response, err := h.llmClient.GenerateFromPrompt(ctx, prompt)
	if err != nil {
		return "", err
	}

	// Clean the response (remove any markdown formatting)
	answer := strings.TrimSpace(response)
	answer = strings.Trim(answer, "`\"")

	return answer, nil
}

// HandleSaveQuestion saves a question-answer pair for the user
func (h *InterviewHandler) HandleSaveQuestion(w http.ResponseWriter, r *http.Request) {
	// Only allow POST requests
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Parse request body
	var req models.SaveQuestionRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondJSON(w, http.StatusBadRequest, map[string]string{"error": "Invalid request body"})
		return
	}

	// Validate required fields
	if req.UserID == "" || req.JobID == "" || req.QuestionID == "" || req.Question == "" || req.Answer == "" {
		respondJSON(w, http.StatusBadRequest, map[string]string{"error": "Missing required fields"})
		return
	}

	ctx, cancel := context.WithTimeout(r.Context(), 15*time.Second) // Increased for embedding generation
	defer cancel()

	// Generate embedding for the question
	var questionEmbedding []byte
	if h.embedder != nil {
		embedding, err := h.embedder.GenerateEmbedding(ctx, req.Question)
		if err != nil {
			log.Printf("Warning: Failed to generate embedding for question %s: %v", req.QuestionID, err)
			// Continue without embedding - it can be generated later on-the-fly
		} else {
			questionEmbedding, err = qamatcher.SerializeEmbedding(embedding)
			if err != nil {
				log.Printf("Warning: Failed to serialize embedding for question %s: %v", req.QuestionID, err)
				questionEmbedding = nil
			}
		}
	}

	// Save the question with embedding
	saved, err := h.savedQuestionRepo.SaveQuestionWithEmbedding(ctx, &req, questionEmbedding)
	if err != nil {
		log.Printf("Error saving question: %v", err)
		respondJSON(w, http.StatusInternalServerError, map[string]string{"error": "Failed to save question"})
		return
	}

	// Return success with saved data
	respondJSON(w, http.StatusOK, map[string]interface{}{
		"success": true,
		"saved":   saved,
	})
	log.Printf("Saved question %s for user %s in job %s", req.QuestionID, req.UserID, req.JobID)
}

// HandleCheckSaved checks if a question is already saved
func (h *InterviewHandler) HandleCheckSaved(w http.ResponseWriter, r *http.Request) {
	userID := r.URL.Query().Get("user_id")
	jobID := r.URL.Query().Get("job_id")
	questionID := r.URL.Query().Get("question_id")

	if userID == "" || jobID == "" || questionID == "" {
		respondJSON(w, http.StatusBadRequest, map[string]string{"error": "Missing required parameters"})
		return
	}

	ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
	defer cancel()

	isSaved, err := h.savedQuestionRepo.IsSaved(ctx, userID, jobID, questionID)
	if err != nil {
		log.Printf("Error checking if question is saved: %v", err)
		respondJSON(w, http.StatusInternalServerError, map[string]string{"error": "Failed to check saved status"})
		return
	}

	respondJSON(w, http.StatusOK, map[string]interface{}{
		"is_saved": isSaved,
	})
}

// HandleGetSavedQuestions retrieves saved questions with pagination and tag filtering
// Supports both user_id (string) and auth_user_id (integer) for filtering
func (h *InterviewHandler) HandleGetSavedQuestions(w http.ResponseWriter, r *http.Request) {
	userID := r.URL.Query().Get("user_id")
	authUserIDStr := r.URL.Query().Get("auth_user_id")

	// Require at least one user identifier
	if userID == "" && authUserIDStr == "" {
		respondJSON(w, http.StatusBadRequest, map[string]string{"error": "Missing required parameter: user_id or auth_user_id"})
		return
	}

	// Parse pagination parameters
	limit := 20 // default
	offset := 0 // default

	if limitParam := r.URL.Query().Get("limit"); limitParam != "" {
		if parsedLimit, err := strconv.Atoi(limitParam); err == nil && parsedLimit > 0 && parsedLimit <= 100 {
			limit = parsedLimit
		}
	}

	if offsetParam := r.URL.Query().Get("offset"); offsetParam != "" {
		if parsedOffset, err := strconv.Atoi(offsetParam); err == nil && parsedOffset >= 0 {
			offset = parsedOffset
		}
	}

	ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
	defer cancel()

	var questions []*models.SavedInterviewQuestion
	var err error

	// Prefer auth_user_id if provided, otherwise use user_id
	if authUserIDStr != "" {
		authUserID, parseErr := strconv.Atoi(authUserIDStr)
		if parseErr != nil {
			respondJSON(w, http.StatusBadRequest, map[string]string{"error": "Invalid auth_user_id"})
			return
		}
		questions, err = h.savedQuestionRepo.GetSavedQuestionsByAuthUserID(ctx, authUserID, limit, offset)
	} else {
		questions, err = h.savedQuestionRepo.GetSavedQuestions(ctx, userID, limit, offset)
	}

	if err != nil {
		log.Printf("Error getting saved questions: %v", err)
		respondJSON(w, http.StatusInternalServerError, map[string]string{"error": "Failed to retrieve saved questions"})
		return
	}

	// Filter by tags if provided
	tagsParam := r.URL.Query().Get("tags")
	if tagsParam != "" {
		filterTags := strings.Split(tagsParam, ",")
		questions = filterQuestionsByTags(questions, filterTags)
	}

	// Return questions with pagination info
	respondJSON(w, http.StatusOK, map[string]interface{}{
		"questions": questions,
		"limit":     limit,
		"offset":    offset,
		"count":     len(questions),
	})
}

// filterQuestionsByTags filters questions that contain any of the specified tags
func filterQuestionsByTags(questions []*models.SavedInterviewQuestion, filterTags []string) []*models.SavedInterviewQuestion {
	if len(filterTags) == 0 {
		return questions
	}

	// Normalize filter tags to lowercase
	normalizedFilters := make(map[string]bool)
	for _, tag := range filterTags {
		normalizedFilters[strings.ToLower(strings.TrimSpace(tag))] = true
	}

	filtered := make([]*models.SavedInterviewQuestion, 0)
	addedIDs := make(map[int64]bool) // Track already added questions

	for _, q := range questions {
		// Check if any of the question's tags match the filter
		for _, tag := range q.Tags {
			if normalizedFilters[strings.ToLower(tag)] {
				if !addedIDs[q.ID] {
					filtered = append(filtered, q)
					addedIDs[q.ID] = true
				}
				break
			}
		}

		// Also check category and difficulty
		if q.Category != nil && normalizedFilters[strings.ToLower(*q.Category)] {
			if !addedIDs[q.ID] {
				filtered = append(filtered, q)
				addedIDs[q.ID] = true
			}
		}

		if q.Difficulty != nil && normalizedFilters[strings.ToLower(*q.Difficulty)] {
			if !addedIDs[q.ID] {
				filtered = append(filtered, q)
				addedIDs[q.ID] = true
			}
		}
	}

	return filtered
}
