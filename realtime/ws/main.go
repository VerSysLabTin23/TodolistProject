package main

import (
	"fmt"
	"log"
	"net/http"
	"sync"

	"github.com/gorilla/websocket"
)

var upgrader = websocket.Upgrader{
	// dev env
	CheckOrigin: func(r *http.Request) bool {
		return true
	},
}

// 定义一个用来存储所有活跃连接的 map。
var clients = make(map[*websocket.Conn]bool) // 客户端连接，true表示活跃

var broadcast = make(chan Message) // 广播消息的通道

var mu sync.Mutex

// 定义一个简单的消息结构体。我们稍后会更详细地讨论它。
type Message struct {
	Content string `json:"content"`
}

func handleConnections(w http.ResponseWriter, r *http.Request) {
	ws, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Fatal("Upgrade error:", err)
	}
	defer ws.Close()

	mu.Lock() //mutal exclusion
	clients[ws] = true
	mu.Unlock()

	for {
		var msg Message
		err := ws.ReadJSON(&msg)
		if err != nil {
			log.Printf("Read error: %v", err)
			mu.Lock()
			delete(clients, ws)
			mu.Unlock()
			break
		}
		broadcast <- msg
	}
}

func handleMessages() {
	for {
		msg := <-broadcast

		mu.Lock()
		for client := range clients {
			err := client.WriteJSON(msg)
			if err != nil {
				log.Panicf("Write error: %v", err)
			}
			client.Close()
			delete(clients, client)
		}
		mu.Unlock()
	}
}

func main() {
	http.HandleFunc("/ws", handleConnections)
	go handleMessages()
	fmt.Println("WebSocket server started on :8080")
	err := http.ListenAndServe(":8080", nil)
	if err != nil {
		log.Fatal("ListenAndServe:", err)
	}
}
