package handler

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"regexp"
	"strings"
	"sync"
	"time"

	"github.com/your-org/websocket-server/internal/repository"
	"github.com/your-org/websocket-server/pkg/models"
)

// AuthHandler handles authentication-related HTTP requests
type AuthHandler struct {
	repo     repository.UserRepository
	sessions sync.Map // Simple in-memory session store (token -> userID)
}

// NewAuthHandler creates a new AuthHandler
func NewAuthHandler(repo repository.UserRepository) *AuthHandler {
	return &AuthHandler{
		repo: repo,
	}
}

// generateToken generates a simple session token
func generateToken() string {
	return fmt.Sprintf("token_%d_%d", time.Now().UnixNano(), time.Now().Unix())
}

// validateEmail checks if email format is valid
func validateEmail(email string) bool {
	emailRegex := regexp.MustCompile(`^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$`)
	return emailRegex.MatchString(email)
}

// Signup handles user registration
func (h *AuthHandler) Signup(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req models.SignupRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		sendAuthError(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	// Validate input
	req.Name = strings.TrimSpace(req.Name)
	req.Email = strings.TrimSpace(strings.ToLower(req.Email))
	req.Password = strings.TrimSpace(req.Password)

	if req.Name == "" {
		sendAuthError(w, "Name is required", http.StatusBadRequest)
		return
	}

	if len(req.Name) < 2 {
		sendAuthError(w, "Name must be at least 2 characters", http.StatusBadRequest)
		return
	}

	if req.Email == "" {
		sendAuthError(w, "Email is required", http.StatusBadRequest)
		return
	}

	if !validateEmail(req.Email) {
		sendAuthError(w, "Invalid email format", http.StatusBadRequest)
		return
	}

	if req.Password == "" {
		sendAuthError(w, "Password is required", http.StatusBadRequest)
		return
	}

	if len(req.Password) < 6 {
		sendAuthError(w, "Password must be at least 6 characters", http.StatusBadRequest)
		return
	}

	// Check if email already exists
	exists, err := h.repo.EmailExists(r.Context(), req.Email)
	if err != nil {
		log.Printf("Error checking email existence: %v", err)
		sendAuthError(w, "Internal server error", http.StatusInternalServerError)
		return
	}

	if exists {
		sendAuthError(w, "Email already registered", http.StatusConflict)
		return
	}

	// Create user
	user := &models.User{
		Name:     req.Name,
		Email:    req.Email,
		Password: req.Password, // Plain text for mock implementation
	}

	createdUser, err := h.repo.CreateUser(r.Context(), user)
	if err != nil {
		log.Printf("Error creating user: %v", err)
		sendAuthError(w, "Failed to create user", http.StatusInternalServerError)
		return
	}

	// Generate session token
	token := generateToken()
	h.sessions.Store(token, createdUser.ID)

	log.Printf("User signed up successfully: %s (%s)", createdUser.Name, createdUser.Email)

	// Send response
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(models.AuthResponse{
		Success: true,
		Message: "User created successfully",
		User:    createdUser.ToResponse(),
		Token:   token,
	})
}

// Login handles user authentication
func (h *AuthHandler) Login(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req models.LoginRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		sendAuthError(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	// Validate input
	req.Email = strings.TrimSpace(strings.ToLower(req.Email))
	req.Password = strings.TrimSpace(req.Password)

	if req.Email == "" {
		sendAuthError(w, "Email is required", http.StatusBadRequest)
		return
	}

	if req.Password == "" {
		sendAuthError(w, "Password is required", http.StatusBadRequest)
		return
	}

	// Get user by email
	user, err := h.repo.GetUserByEmail(r.Context(), req.Email)
	if err != nil {
		log.Printf("Error getting user: %v", err)
		sendAuthError(w, "Internal server error", http.StatusInternalServerError)
		return
	}

	if user == nil {
		sendAuthError(w, "Invalid email or password", http.StatusUnauthorized)
		return
	}

	// Check password (plain text comparison for mock implementation)
	if user.Password != req.Password {
		sendAuthError(w, "Invalid email or password", http.StatusUnauthorized)
		return
	}

	// Generate session token
	token := generateToken()
	h.sessions.Store(token, user.ID)

	log.Printf("User logged in successfully: %s (%s)", user.Name, user.Email)

	// Send response
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(models.AuthResponse{
		Success: true,
		Message: "Login successful",
		User:    user.ToResponse(),
		Token:   token,
	})
}

// Logout handles user logout
func (h *AuthHandler) Logout(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Get token from Authorization header
	authHeader := r.Header.Get("Authorization")
	if authHeader == "" {
		sendAuthError(w, "No authorization token", http.StatusBadRequest)
		return
	}

	token := strings.TrimPrefix(authHeader, "Bearer ")

	// Remove session
	h.sessions.Delete(token)

	log.Printf("User logged out, token invalidated")

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(models.AuthResponse{
		Success: true,
		Message: "Logout successful",
	})
}

// GetCurrentUser returns the current authenticated user
func (h *AuthHandler) GetCurrentUser(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Get token from Authorization header
	authHeader := r.Header.Get("Authorization")
	if authHeader == "" {
		sendAuthError(w, "No authorization token", http.StatusUnauthorized)
		return
	}

	token := strings.TrimPrefix(authHeader, "Bearer ")

	// Get user ID from session
	userIDValue, ok := h.sessions.Load(token)
	if !ok {
		sendAuthError(w, "Invalid or expired token", http.StatusUnauthorized)
		return
	}

	userID := userIDValue.(int)

	// Get user from database
	user, err := h.repo.GetUserByID(r.Context(), userID)
	if err != nil {
		log.Printf("Error getting user: %v", err)
		sendAuthError(w, "Internal server error", http.StatusInternalServerError)
		return
	}

	if user == nil {
		sendAuthError(w, "User not found", http.StatusNotFound)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(models.AuthResponse{
		Success: true,
		User:    user.ToResponse(),
	})
}

// sendAuthError sends an error response
func sendAuthError(w http.ResponseWriter, message string, statusCode int) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(statusCode)
	json.NewEncoder(w).Encode(models.AuthResponse{
		Success: false,
		Message: message,
	})
}
