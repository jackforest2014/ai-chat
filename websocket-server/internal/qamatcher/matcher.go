package qamatcher

import (
	"context"

	"github.com/your-org/websocket-server/pkg/models"
)

// MatchResult represents a matched Q&A pair with similarity score
type MatchResult struct {
	Question   string  // The matched question
	Answer     string  // The corresponding answer
	QuestionID string  // ID of the matched question
	Similarity float64 // Similarity score (0-1)
	Found      bool    // Whether a match was found
}

// QAMatcher defines the interface for Q&A matching strategies
// This allows for different matching implementations (embedding-based, keyword-based, etc.)
type QAMatcher interface {
	// LoadQuestions loads Q&A pairs into memory for matching
	LoadQuestions(questions []*models.SavedInterviewQuestion) error

	// FindMatch searches for a matching question for the given query
	// Returns the best match if similarity is above the threshold
	FindMatch(ctx context.Context, query string) (*MatchResult, error)

	// GetThreshold returns the current similarity threshold
	GetThreshold() float64

	// SetThreshold updates the similarity threshold
	SetThreshold(threshold float64)

	// Clear removes all loaded questions from memory
	Clear()

	// Count returns the number of loaded questions
	Count() int
}
