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

type TaskEvent struct {
	EventType  string      `json:"eventType"`
	TaskID     int         `json:"taskId"`
	TeamID     int         `json:"teamId"`
	ActorID    int         `json:"actorId"`
	CreatorID  int         `json:"creatorId"`
	AssigneeID *int        `json:"assigneeId,omitempty"`
	Timestamp  time.Time   `json:"timestamp"`
	Payload    interface{} `json:"payload,omitempty"`
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

func (p *KafkaProducer) publish(ctx context.Context, topic string, evt TaskEvent) error {
	if p == nil || p.writer == nil {
		return nil
	}
	b, err := json.Marshal(evt)
	if err != nil {
		return err
	}
	return p.writer.WriteMessages(ctx, kafka.Message{
		Topic: topic,
		Key:   []byte("team:" + itoa(evt.TeamID)),
		Value: b,
		Time:  time.Now(),
	})
}

func (p *KafkaProducer) TaskUpdated(ctx context.Context, taskID, teamID, actorID, creatorID int, assigneeID *int, payload interface{}) error {
	return p.publish(ctx, "task.updated", TaskEvent{
		EventType:  "task.updated",
		TaskID:     taskID,
		TeamID:     teamID,
		ActorID:    actorID,
		CreatorID:  creatorID,
		AssigneeID: assigneeID,
		Timestamp:  time.Now(),
		Payload:    payload,
	})
}

func (p *KafkaProducer) TaskCreated(ctx context.Context, taskID, teamID, actorID, creatorID int, assigneeID *int, payload interface{}) error {
	return p.publish(ctx, "task.created", TaskEvent{
		EventType:  "task.created",
		TaskID:     taskID,
		TeamID:     teamID,
		ActorID:    actorID,
		CreatorID:  creatorID,
		AssigneeID: assigneeID,
		Timestamp:  time.Now(),
		Payload:    payload,
	})
}

func (p *KafkaProducer) TaskDeleted(ctx context.Context, taskID, teamID, actorID, creatorID int, assigneeID *int, payload interface{}) error {
	return p.publish(ctx, "task.deleted", TaskEvent{
		EventType:  "task.deleted",
		TaskID:     taskID,
		TeamID:     teamID,
		ActorID:    actorID,
		CreatorID:  creatorID,
		AssigneeID: assigneeID,
		Timestamp:  time.Now(),
		Payload:    payload,
	})
}

func (p *KafkaProducer) TaskCompleted(ctx context.Context, taskID, teamID, actorID, creatorID int, assigneeID *int, completed bool) error {
	return p.publish(ctx, "task.completed", TaskEvent{
		EventType:  "task.completed",
		TaskID:     taskID,
		TeamID:     teamID,
		ActorID:    actorID,
		CreatorID:  creatorID,
		AssigneeID: assigneeID,
		Timestamp:  time.Now(),
		Payload:    map[string]bool{"completed": completed},
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
