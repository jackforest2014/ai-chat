package qamatcher

import (
	"bytes"
	"context"
	"encoding/binary"
	"fmt"
	"math"
	"sync"

	"github.com/your-org/websocket-server/internal/analyzer"
	"github.com/your-org/websocket-server/pkg/models"
)

// questionEmbedding holds a question with its embedding
type questionEmbedding struct {
	QuestionID string
	Question   string
	Answer     string
	Embedding  []float32
}

// EmbeddingMatcher implements Q&A matching using semantic embedding similarity
type EmbeddingMatcher struct {
	embedder          analyzer.EmbeddingGenerator
	questions         []*questionEmbedding
	threshold         float64 // Minimum similarity score (0-1)
	mu                sync.RWMutex
	generateOnTheFly  bool // Whether to generate embeddings on-the-fly if not stored
}

// NewEmbeddingMatcher creates a new embedding-based Q&A matcher
func NewEmbeddingMatcher(embedder analyzer.EmbeddingGenerator, threshold float64) *EmbeddingMatcher {
	return &EmbeddingMatcher{
		embedder:         embedder,
		threshold:        threshold,
		questions:        make([]*questionEmbedding, 0),
		generateOnTheFly: true, // Enable on-the-fly generation for now
	}
}

// LoadQuestions loads Q&A pairs with embeddings into memory
func (m *EmbeddingMatcher) LoadQuestions(questions []*models.SavedInterviewQuestion) error {
	m.mu.Lock()
	defer m.mu.Unlock()

	m.questions = make([]*questionEmbedding, 0, len(questions))

	for _, q := range questions {
		var embedding []float32
		var err error

		// Try to use stored embedding first
		if len(q.QuestionEmbedding) > 0 {
			embedding, err = deserializeEmbedding(q.QuestionEmbedding)
			if err != nil {
				// If deserialization fails and on-the-fly generation is enabled, generate new embedding
				if m.generateOnTheFly {
					embedding, err = m.generateEmbedding(context.Background(), q.Question)
					if err != nil {
						return fmt.Errorf("failed to generate embedding for question %s: %w", q.QuestionID, err)
					}
				} else {
					return fmt.Errorf("failed to deserialize embedding for question %s: %w", q.QuestionID, err)
				}
			}
		} else if m.generateOnTheFly {
			// No stored embedding, generate on-the-fly
			embedding, err = m.generateEmbedding(context.Background(), q.Question)
			if err != nil {
				return fmt.Errorf("failed to generate embedding for question %s: %w", q.QuestionID, err)
			}
		} else {
			return fmt.Errorf("question %s has no embedding and on-the-fly generation is disabled", q.QuestionID)
		}

		m.questions = append(m.questions, &questionEmbedding{
			QuestionID: q.QuestionID,
			Question:   q.Question,
			Answer:     q.Answer,
			Embedding:  embedding,
		})
	}

	return nil
}

// FindMatch searches for the best matching question using cosine similarity
func (m *EmbeddingMatcher) FindMatch(ctx context.Context, query string) (*MatchResult, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()

	if len(m.questions) == 0 {
		return &MatchResult{Found: false}, nil
	}

	// Generate embedding for the query
	queryEmbedding, err := m.generateEmbedding(ctx, query)
	if err != nil {
		return nil, fmt.Errorf("failed to generate query embedding: %w", err)
	}

	// Find the best match using cosine similarity
	var bestMatch *questionEmbedding
	var bestSimilarity float64 = -1.0

	for _, q := range m.questions {
		similarity := cosineSimilarity(queryEmbedding, q.Embedding)
		if similarity > bestSimilarity {
			bestSimilarity = similarity
			bestMatch = q
		}
	}

	// Check if best match exceeds threshold
	if bestMatch != nil && bestSimilarity >= m.threshold {
		return &MatchResult{
			Question:   bestMatch.Question,
			Answer:     bestMatch.Answer,
			QuestionID: bestMatch.QuestionID,
			Similarity: bestSimilarity,
			Found:      true,
		}, nil
	}

	return &MatchResult{
		Similarity: bestSimilarity,
		Found:      false,
	}, nil
}

// GetThreshold returns the current similarity threshold
func (m *EmbeddingMatcher) GetThreshold() float64 {
	m.mu.RLock()
	defer m.mu.RUnlock()
	return m.threshold
}

// SetThreshold updates the similarity threshold
func (m *EmbeddingMatcher) SetThreshold(threshold float64) {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.threshold = threshold
}

// Clear removes all loaded questions from memory
func (m *EmbeddingMatcher) Clear() {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.questions = make([]*questionEmbedding, 0)
}

// Count returns the number of loaded questions
func (m *EmbeddingMatcher) Count() int {
	m.mu.RLock()
	defer m.mu.RUnlock()
	return len(m.questions)
}

// generateEmbedding generates an embedding for the given text
func (m *EmbeddingMatcher) generateEmbedding(ctx context.Context, text string) ([]float32, error) {
	embedding, err := m.embedder.GenerateEmbedding(ctx, text)
	if err != nil {
		return nil, err
	}
	return embedding, nil
}

// cosineSimilarity calculates cosine similarity between two embeddings
// Returns a value between -1 and 1, where 1 means identical direction
func cosineSimilarity(a, b []float32) float64 {
	if len(a) != len(b) {
		return 0
	}

	var dotProduct float64
	var normA float64
	var normB float64

	for i := 0; i < len(a); i++ {
		dotProduct += float64(a[i]) * float64(b[i])
		normA += float64(a[i]) * float64(a[i])
		normB += float64(b[i]) * float64(b[i])
	}

	if normA == 0 || normB == 0 {
		return 0
	}

	return dotProduct / (math.Sqrt(normA) * math.Sqrt(normB))
}

// serializeEmbedding converts a float32 slice to bytes for storage
func SerializeEmbedding(embedding []float32) ([]byte, error) {
	buf := new(bytes.Buffer)
	err := binary.Write(buf, binary.LittleEndian, embedding)
	if err != nil {
		return nil, fmt.Errorf("failed to serialize embedding: %w", err)
	}
	return buf.Bytes(), nil
}

// deserializeEmbedding converts bytes back to a float32 slice
func deserializeEmbedding(data []byte) ([]float32, error) {
	if len(data)%4 != 0 {
		return nil, fmt.Errorf("invalid embedding data length: %d", len(data))
	}

	embedding := make([]float32, len(data)/4)
	buf := bytes.NewReader(data)
	err := binary.Read(buf, binary.LittleEndian, &embedding)
	if err != nil {
		return nil, fmt.Errorf("failed to deserialize embedding: %w", err)
	}

	return embedding, nil
}
