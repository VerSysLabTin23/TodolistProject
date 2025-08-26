package main

import (
	"log"
	"net/http"
	"strconv"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/gorilla/websocket"
)

// WebSocket upgrader with CORS settings
var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
	CheckOrigin: func(r *http.Request) bool {
		// Allow all origins for development
		// In production, implement proper origin checking
		return true
	},
}

// Client represents a WebSocket client connection
type Client struct {
	conn   *websocket.Conn
	send   chan UnifiedEvent
	userID int
	hub    *Hub
}

// Hub manages WebSocket connections and broadcasts
type Hub struct {
	clients     map[*Client]bool
	broadcast   chan UnifiedEvent
	register    chan *Client
	unregister  chan *Client
	userClients map[int]*Client // userID -> client (one connection per user)
	mu          sync.RWMutex
}

// NewHub creates a new WebSocket hub
func NewHub() *Hub {
	return &Hub{
		clients:     make(map[*Client]bool),
		broadcast:   make(chan UnifiedEvent),
		register:    make(chan *Client),
		unregister:  make(chan *Client),
		userClients: make(map[int]*Client),
	}
}

// Run starts the hub's main loop
func (h *Hub) Run() {
	for {
		select {
		case client := <-h.register:
			h.mu.Lock()
			// If user already has a connection, close the old one
			if existingClient, exists := h.userClients[client.userID]; exists {
				delete(h.clients, existingClient)
				close(existingClient.send)
			}

			h.clients[client] = true
			h.userClients[client.userID] = client
			h.mu.Unlock()
			log.Printf("Client connected: userID=%d, total=%d",
				client.userID, len(h.clients))

		case client := <-h.unregister:
			h.mu.Lock()
			if _, ok := h.clients[client]; ok {
				delete(h.clients, client)
				delete(h.userClients, client.userID)
				close(client.send)
				h.mu.Unlock()
				log.Printf("Client disconnected: userID=%d, total=%d",
					client.userID, len(h.clients))
			} else {
				h.mu.Unlock()
			}

		case <-h.broadcast:
			// This will be called by BroadcastToUsers with target userIDs
			// For now, this shouldn't be used directly
			log.Printf("Warning: direct broadcast not supported, use BroadcastToUsers instead")
		}
	}
}

// BroadcastToUsers sends an event to specific users
func (h *Hub) BroadcastToUsers(event UnifiedEvent, userIDs []int) {
	h.mu.RLock()
	defer h.mu.RUnlock()

	log.Printf("📢 Broadcasting event %s to users: %v", event.Type, userIDs)
	log.Printf("🔗 Currently connected users: %v", h.getCurrentConnectedUsers())

	for _, userID := range userIDs {
		if client, exists := h.userClients[userID]; exists {
			select {
			case client.send <- event:
				log.Printf("✅ Event sent successfully to user %d: %s", userID, event.Type)
			default:
				log.Printf("❌ Client channel full for user %d, dropping event: %s", userID, event.Type)
				// Optionally disconnect the client if channel is consistently full
				go func(c *Client) {
					h.unregister <- c
				}(client)
			}
		} else {
			log.Printf("⚠️ User %d not connected to WebSocket", userID)
		}
	}
}

// getCurrentConnectedUsers returns list of currently connected user IDs
func (h *Hub) getCurrentConnectedUsers() []int {
	var users []int
	for userID := range h.userClients {
		users = append(users, userID)
	}
	return users
}

// BroadcastToTeam sends an event to all users in a specific team (deprecated - use BroadcastToUsers)
func (h *Hub) BroadcastToTeam(event UnifiedEvent) {
	log.Printf("Warning: BroadcastToTeam is deprecated, use BroadcastToUsers instead")
}

// HandleWebSocket handles WebSocket connection upgrade and management
func (h *Hub) HandleWebSocket(c *gin.Context) {
	// Get user ID from query parameter (in production, extract from JWT)
	userIDStr := c.Query("userId")
	if userIDStr == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "userId parameter required"})
		return
	}

	userID, err := strconv.Atoi(userIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid userId"})
		return
	}

	// TODO: Validate JWT token
	// For now, we'll assume the user is authorized

	// Upgrade HTTP connection to WebSocket
	conn, err := upgrader.Upgrade(c.Writer, c.Request, nil)
	if err != nil {
		log.Printf("WebSocket upgrade error: %v", err)
		return
	}

	// Create new client
	client := &Client{
		conn:   conn,
		send:   make(chan UnifiedEvent, 256),
		userID: userID,
		hub:    h,
	}

	// Register client with hub
	h.register <- client

	// Start goroutines for reading and writing
	go client.writePump()
	go client.readPump()
}

// readPump handles reading messages from the WebSocket connection
func (c *Client) readPump() {
	defer func() {
		c.hub.unregister <- c
		c.conn.Close()
	}()

	// Set read deadline and pong handler for keepalive
	c.conn.SetReadDeadline(time.Now().Add(60 * time.Second))
	c.conn.SetPongHandler(func(string) error {
		c.conn.SetReadDeadline(time.Now().Add(60 * time.Second))
		return nil
	})

	for {
		// Read message from client (for now, we just ignore client messages)
		_, _, err := c.conn.ReadMessage()
		if err != nil {
			if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
				log.Printf("WebSocket error: %v", err)
			}
			break
		}
	}
}

// writePump handles writing messages to the WebSocket connection
func (c *Client) writePump() {
	ticker := time.NewTicker(54 * time.Second)
	defer func() {
		ticker.Stop()
		c.conn.Close()
	}()

	for {
		select {
		case event, ok := <-c.send:
			c.conn.SetWriteDeadline(time.Now().Add(10 * time.Second))
			if !ok {
				c.conn.WriteMessage(websocket.CloseMessage, []byte{})
				return
			}

			// Send the event as JSON
			if err := c.conn.WriteJSON(event); err != nil {
				log.Printf("WebSocket write error: %v", err)
				return
			}

		case <-ticker.C:
			c.conn.SetWriteDeadline(time.Now().Add(10 * time.Second))
			if err := c.conn.WriteMessage(websocket.PingMessage, nil); err != nil {
				return
			}
		}
	}
}
