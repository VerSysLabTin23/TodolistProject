package clients

import (
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"time"
)

// TeamClient handles communication with Team Service
type TeamClient struct {
	baseURL    string
	httpClient *http.Client
}

// NewTeamClient creates a new team service client
func NewTeamClient() *TeamClient {
	baseURL := os.Getenv("TEAM_SERVICE_URL")
	if baseURL == "" {
		baseURL = "http://localhost:8083" // fallback for local development
	}

	return &TeamClient{
		baseURL: baseURL,
		httpClient: &http.Client{
			Timeout: 10 * time.Second, // timeout for http client
		},
	}
}

// Team represents a team from Team Service
type Team struct {
	ID          int     `json:"id"`
	Name        string  `json:"name"`
	Description *string `json:"description"`
	OwnerID     int     `json:"ownerId"`
}

// TeamMember represents a team member from Team Service
type TeamMember struct {
	UserID   int    `json:"userId"`
	TeamID   int    `json:"teamId"`
	Role     string `json:"role"`
	JoinedAt string `json:"joinedAt"`
}

// GetTeam retrieves team information from Team Service
func (tc *TeamClient) GetTeam(teamID int, bearerToken string) (*Team, error) {
	url := fmt.Sprintf("%s/teams/%d", tc.baseURL, teamID)

	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}
	if bearerToken != "" {
		req.Header.Set("Authorization", "Bearer "+bearerToken)
	}

	resp, err := tc.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("failed to call team service: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode == http.StatusNotFound {
		return nil, nil // Team not found
	}

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("team service returned status: %d", resp.StatusCode) // error
	}

	var team Team
	if err := json.NewDecoder(resp.Body).Decode(&team); err != nil {
		return nil, fmt.Errorf("failed to decode team response: %w", err)
	}

	return &team, nil
}

// IsUserInTeam checks if a user is a member of a team using GetUserTeams
func (tc *TeamClient) IsUserInTeam(userID, teamID int, bearerToken string) (bool, error) {
	teams, err := tc.GetUserTeams(userID, bearerToken)
	if err != nil {
		return false, err
	}
	for _, t := range teams {
		if t.ID == teamID {
			return true, nil
		}
	}
	return false, nil
}

// GetUserRoleInTeam gets the role of a user in a team by scanning members
func (tc *TeamClient) GetUserRoleInTeam(userID, teamID int, bearerToken string) (string, error) {
	// Fall back to members list with Authorization if available
	url := fmt.Sprintf("%s/teams/%d/members", tc.baseURL, teamID)

	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return "", fmt.Errorf("failed to create request: %w", err)
	}
	if bearerToken != "" {
		req.Header.Set("Authorization", "Bearer "+bearerToken)
	}

	resp, err := tc.httpClient.Do(req)
	if err != nil {
		return "", fmt.Errorf("failed to call team service: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("team service returned status: %d", resp.StatusCode)
	}

	var members []TeamMember
	if err := json.NewDecoder(resp.Body).Decode(&members); err != nil {
		return "", fmt.Errorf("failed to decode members response: %w", err)
	}

	// Find user's role
	for _, member := range members {
		if member.UserID == userID {
			return member.Role, nil
		}
	}

	return "", fmt.Errorf("user not found in team")
}

// GetUserTeams returns all teams that a user belongs to
func (tc *TeamClient) GetUserTeams(userID int, bearerToken string) ([]Team, error) {
	url := fmt.Sprintf("%s/users/%d/teams", tc.baseURL, userID)

	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}
	if bearerToken != "" {
		req.Header.Set("Authorization", "Bearer "+bearerToken)
	}

	resp, err := tc.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("failed to call team service: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("team service returned status: %d", resp.StatusCode)
	}

	var teams []Team
	if err := json.NewDecoder(resp.Body).Decode(&teams); err != nil {
		return nil, fmt.Errorf("failed to decode teams response: %w", err)
	}

	return teams, nil
}
