package events

import (
	"context"
	"encoding/json"
	"os"
	"time"

	"github.com/segmentio/kafka-go"
)

type KafkaProducer struct {
	writer *kafka.Writer
}

type UserEvent struct {
	EventType string      `json:"eventType"`
	UserID    int         `json:"userId"`
	Timestamp time.Time   `json:"timestamp"`
	Payload   interface{} `json:"payload,omitempty"`
}

func NewKafkaProducer() *KafkaProducer {
	brokers := os.Getenv("KAFKA_BROKERS")
	if brokers == "" {
		brokers = "dev_kafka:9092"
	}
	return &KafkaProducer{
		writer: &kafka.Writer{
			Addr:         kafka.TCP(brokers),
			RequiredAcks: kafka.RequireOne,
			Async:        true,
		},
	}
}

func (p *KafkaProducer) Close() error {
	if p == nil || p.writer == nil {
		return nil
	}
	return p.writer.Close()
}

func (p *KafkaProducer) publish(ctx context.Context, topic string, evt UserEvent) error {
	if p == nil || p.writer == nil {
		return nil
	}
	b, err := json.Marshal(evt)
	if err != nil {
		return err
	}
	return p.writer.WriteMessages(ctx, kafka.Message{
		Topic: topic,
		Key:   []byte("user:" + itoa(evt.UserID)),
		Value: b,
		Time:  time.Now(),
	})
}

func (p *KafkaProducer) UserCreated(ctx context.Context, userID int, email, username string) error {
	return p.publish(ctx, "user.created", UserEvent{
		EventType: "user.created",
		UserID:    userID,
		Timestamp: time.Now(),
		Payload: map[string]interface{}{
			"email":    email,
			"username": username,
		},
	})
}

// small itoa to avoid fmt import
func itoa(i int) string {
	if i == 0 {
		return "0"
	}
	neg := false
	if i < 0 {
		neg = true
		i = -i
	}
	var buf [20]byte
	pos := len(buf)
	for i > 0 {
		pos--
		buf[pos] = byte('0' + i%10)
		i /= 10
	}
	if neg {
		pos--
		buf[pos] = '-'
	}
	return string(buf[pos:])
}
