package main

import (
	"encoding/json"
	"fmt"
	"net/http"
	"os"
)

type AuthClient struct {
	baseURL string
}

type User struct {
	ID       int    `json:"id"`
	Username string `json:"username"`
	Email    string `json:"email"`
	Role     string `json:"role"`
}

func NewAuthClient() *AuthClient {
	baseURL := os.Getenv("AUTH_SERVICE_URL")
	if baseURL == "" {
		baseURL = "http://auth-service:8084"
	}
	return &AuthClient{baseURL: baseURL}
}

func (c *AuthClient) GetUserByID(userID int) (*User, error) {
	url := fmt.Sprintf("%s/internal/users/%d", c.baseURL, userID)
	
	resp, err := http.Get(url)
	if err != nil {
		return nil, fmt.Errorf("failed to get user: %w", err)
	}
	defer resp.Body.Close()
	
	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("auth service returned status: %d", resp.StatusCode)
	}
	
	var user User
	if err := json.NewDecoder(resp.Body).Decode(&user); err != nil {
		return nil, fmt.Errorf("failed to decode user response: %w", err)
	}
	
	return &user, nil
}
