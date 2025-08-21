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
func (tc *TeamClient) GetTeam(teamID int) (*Team, error) {
	url := fmt.Sprintf("%s/teams/%d", tc.baseURL, teamID)

	resp, err := tc.httpClient.Get(url)
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

// IsUserInTeam checks if a user is a member of a team
func (tc *TeamClient) IsUserInTeam(userID, teamID int) (bool, error) {
	url := fmt.Sprintf("%s/teams/%d/members", tc.baseURL, teamID)

	resp, err := tc.httpClient.Get(url)
	if err != nil {
		return false, fmt.Errorf("failed to call team service: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return false, fmt.Errorf("team service returned status: %d", resp.StatusCode)
	}

	var members []TeamMember
	if err := json.NewDecoder(resp.Body).Decode(&members); err != nil {
		return false, fmt.Errorf("failed to decode members response: %w", err) // Json format error
	}

	// Check if user is in the team
	for _, member := range members {
		if member.UserID == userID {
			return true, nil
		}
	}

	return false, nil
}

// GetUserRoleInTeam gets the role of a user in a team
func (tc *TeamClient) GetUserRoleInTeam(userID, teamID int) (string, error) {
	url := fmt.Sprintf("%s/teams/%d/members", tc.baseURL, teamID)

	resp, err := tc.httpClient.Get(url)
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
func (tc *TeamClient) GetUserTeams(userID int) ([]Team, error) {
	url := fmt.Sprintf("%s/users/%d/teams", tc.baseURL, userID)

	resp, err := tc.httpClient.Get(url)
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
