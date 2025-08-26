package events

import (
	"context"
	"encoding/json"
	"os"
	"time"

	"github.com/segmentio/kafka-go"
)

type KafkaProducer struct {
	brokers string
	writers map[string]*kafka.Writer
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
	return &KafkaProducer{brokers: brokers, writers: make(map[string]*kafka.Writer)}
}

func (p *KafkaProducer) Close() error {
	if p == nil {
		return nil
	}
	var firstErr error
	for _, w := range p.writers {
		if w != nil {
			if err := w.Close(); err != nil && firstErr == nil {
				firstErr = err
			}
		}
	}
	return firstErr
}

func (p *KafkaProducer) getWriter(topic string) *kafka.Writer {
	if w, ok := p.writers[topic]; ok && w != nil {
		return w
	}
	w := &kafka.Writer{
		Addr:         kafka.TCP(p.brokers),
		Topic:        topic,
		RequiredAcks: kafka.RequireOne,
		Async:        true,
	}
	p.writers[topic] = w
	return w
}

func (p *KafkaProducer) publish(ctx context.Context, topic string, evt TaskEvent) error {
	if p == nil {
		return nil
	}
	b, err := json.Marshal(evt)
	if err != nil {
		return err
	}
	w := p.getWriter(topic)
	return w.WriteMessages(ctx, kafka.Message{
		Key:   []byte("task:" + itoa(evt.TaskID)),
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
