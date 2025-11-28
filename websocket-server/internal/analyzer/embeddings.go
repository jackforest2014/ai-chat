package analyzer

import (
	"context"
	"fmt"

	"github.com/tmc/langchaingo/embeddings"
	"github.com/tmc/langchaingo/llms/openai"
)

// DefaultEmbeddingGenerator implements EmbeddingGenerator interface using LangChain
type DefaultEmbeddingGenerator struct {
	embedder *embeddings.EmbedderImpl
}

// NewEmbeddingGenerator creates a new embedding generator
// Note: This uses OpenAI embeddings by default. You can replace with your preferred embedding model.
func NewEmbeddingGenerator(apiKey string) (EmbeddingGenerator, error) {
	if apiKey == "" {
		return nil, fmt.Errorf("API key is required for embedding generation")
	}

	// Create OpenAI LLM client
	llm, err := openai.New(
		openai.WithToken(apiKey),
		openai.WithModel("text-embedding-ada-002"), // OpenAI's embedding model
	)
	if err != nil {
		return nil, fmt.Errorf("failed to create OpenAI client: %w", err)
	}

	// Create embedder
	embedder, err := embeddings.NewEmbedder(llm)
	if err != nil {
		return nil, fmt.Errorf("failed to create embedder: %w", err)
	}

	return &DefaultEmbeddingGenerator{
		embedder: embedder,
	}, nil
}

// GenerateEmbedding creates a vector embedding for the given text
func (e *DefaultEmbeddingGenerator) GenerateEmbedding(ctx context.Context, text string) ([]float32, error) {
	if text == "" {
		return nil, fmt.Errorf("text cannot be empty")
	}

	// Generate embedding
	result, err := e.embedder.EmbedQuery(ctx, text)
	if err != nil {
		return nil, fmt.Errorf("failed to generate embedding: %w", err)
	}

	return result, nil
}

// GenerateEmbeddings creates vector embeddings for multiple texts
func (e *DefaultEmbeddingGenerator) GenerateEmbeddings(ctx context.Context, texts []string) ([][]float32, error) {
	if len(texts) == 0 {
		return nil, fmt.Errorf("texts cannot be empty")
	}

	embeddings := make([][]float32, len(texts))

	// Generate embeddings for each text
	for i, text := range texts {
		if text == "" {
			return nil, fmt.Errorf("text at index %d is empty", i)
		}

		embedding, err := e.embedder.EmbedQuery(ctx, text)
		if err != nil {
			return nil, fmt.Errorf("failed to generate embedding for text %d: %w", i, err)
		}

		embeddings[i] = embedding
	}

	return embeddings, nil
}

// PlaceholderEmbeddingGenerator is a placeholder implementation for testing without API keys
type PlaceholderEmbeddingGenerator struct{}

// NewPlaceholderEmbeddingGenerator creates a placeholder embedding generator
func NewPlaceholderEmbeddingGenerator() EmbeddingGenerator {
	return &PlaceholderEmbeddingGenerator{}
}

// GenerateEmbedding returns a placeholder embedding vector
func (e *PlaceholderEmbeddingGenerator) GenerateEmbedding(ctx context.Context, text string) ([]float32, error) {
	if text == "" {
		return nil, fmt.Errorf("text cannot be empty")
	}

	// Return a simple placeholder embedding (dimension 1536 to match OpenAI's ada-002)
	embedding := make([]float32, 1536)
	for i := range embedding {
		embedding[i] = 0.1 // Simple placeholder values
	}

	return embedding, nil
}

// GenerateEmbeddings returns placeholder embedding vectors
func (e *PlaceholderEmbeddingGenerator) GenerateEmbeddings(ctx context.Context, texts []string) ([][]float32, error) {
	if len(texts) == 0 {
		return nil, fmt.Errorf("texts cannot be empty")
	}

	embeddings := make([][]float32, len(texts))
	for i, text := range texts {
		if text == "" {
			return nil, fmt.Errorf("text at index %d is empty", i)
		}

		embedding := make([]float32, 1536)
		for j := range embedding {
			embedding[j] = 0.1 // Simple placeholder values
		}
		embeddings[i] = embedding
	}

	return embeddings, nil
}
