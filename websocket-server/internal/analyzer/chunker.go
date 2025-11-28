package analyzer

import (
	"fmt"
	"strings"
	"unicode"
)

// DefaultTextChunker implements TextChunker interface
type DefaultTextChunker struct{}

// NewTextChunker creates a new text chunker instance
func NewTextChunker() TextChunker {
	return &DefaultTextChunker{}
}

// ChunkText splits text into semantic chunks with overlap
func (c *DefaultTextChunker) ChunkText(text string, chunkSize int, overlap int) ([]string, error) {
	if chunkSize <= 0 {
		return nil, fmt.Errorf("chunk size must be positive")
	}
	if overlap < 0 || overlap >= chunkSize {
		return nil, fmt.Errorf("overlap must be non-negative and less than chunk size")
	}

	// Clean and normalize text
	text = cleanAndNormalize(text)
	if len(text) == 0 {
		return nil, fmt.Errorf("text is empty after cleaning")
	}

	// Split into sentences for more semantic chunking
	sentences := splitIntoSentences(text)
	if len(sentences) == 0 {
		return nil, fmt.Errorf("no sentences found in text")
	}

	var chunks []string
	var currentChunk strings.Builder
	var currentLength int

	for i, sentence := range sentences {
		sentenceLength := len(sentence)

		// If adding this sentence would exceed chunk size, save current chunk
		if currentLength > 0 && currentLength+sentenceLength > chunkSize {
			chunks = append(chunks, strings.TrimSpace(currentChunk.String()))

			// Handle overlap by keeping last few sentences
			if overlap > 0 {
				currentChunk.Reset()
				currentLength = 0

				// Go back and add sentences for overlap
				overlapLength := 0
				for j := i - 1; j >= 0 && overlapLength < overlap; j-- {
					overlapSentence := sentences[j]
					if overlapLength+len(overlapSentence) <= overlap {
						currentChunk.WriteString(overlapSentence)
						currentChunk.WriteString(" ")
						currentLength += len(overlapSentence) + 1
						overlapLength += len(overlapSentence) + 1
					} else {
						break
					}
				}
			} else {
				currentChunk.Reset()
				currentLength = 0
			}
		}

		// Add current sentence to chunk
		if currentLength > 0 {
			currentChunk.WriteString(" ")
			currentLength++
		}
		currentChunk.WriteString(sentence)
		currentLength += sentenceLength
	}

	// Add the last chunk if it has content
	if currentLength > 0 {
		chunks = append(chunks, strings.TrimSpace(currentChunk.String()))
	}

	if len(chunks) == 0 {
		return nil, fmt.Errorf("no chunks generated")
	}

	return chunks, nil
}

// splitIntoSentences splits text into sentences
func splitIntoSentences(text string) []string {
	var sentences []string
	var currentSentence strings.Builder

	runes := []rune(text)
	for i := 0; i < len(runes); i++ {
		currentSentence.WriteRune(runes[i])

		// Check for sentence terminators
		if isSentenceTerminator(runes[i]) {
			// Look ahead to check if this is really end of sentence
			if i+1 < len(runes) && unicode.IsSpace(runes[i+1]) {
				// Check if next word starts with capital letter (new sentence)
				if i+2 < len(runes) && (unicode.IsUpper(runes[i+2]) || unicode.IsSpace(runes[i+2])) {
					sentence := strings.TrimSpace(currentSentence.String())
					if len(sentence) > 0 {
						sentences = append(sentences, sentence)
					}
					currentSentence.Reset()
				}
			}
		}
	}

	// Add remaining text as last sentence
	if currentSentence.Len() > 0 {
		sentence := strings.TrimSpace(currentSentence.String())
		if len(sentence) > 0 {
			sentences = append(sentences, sentence)
		}
	}

	return sentences
}

// isSentenceTerminator checks if a rune is a sentence terminator
func isSentenceTerminator(r rune) bool {
	return r == '.' || r == '!' || r == '?' || r == '\n'
}

// cleanAndNormalize cleans and normalizes text
func cleanAndNormalize(text string) string {
	// Replace multiple spaces with single space
	text = strings.Join(strings.Fields(text), " ")

	// Replace multiple newlines with single newline
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
