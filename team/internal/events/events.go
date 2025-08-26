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

type TeamEvent struct {
	EventType string      `json:"eventType"`
	TeamID    int         `json:"teamId"`
	ActorID   int         `json:"actorId"`
	OwnerID   int         `json:"ownerId"`
	Timestamp time.Time   `json:"timestamp"`
	Payload   interface{} `json:"payload,omitempty"`
}

type TeamMemberEvent struct {
	EventType string      `json:"eventType"`
	TeamID    int         `json:"teamId"`
	UserID    int         `json:"userId"`
	ActorID   int         `json:"actorId"`
	Role      string      `json:"role,omitempty"`
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

func (p *KafkaProducer) publishTeamEvent(ctx context.Context, topic string, evt TeamEvent) error {
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

func (p *KafkaProducer) publishMemberEvent(ctx context.Context, topic string, evt TeamMemberEvent) error {
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

func (p *KafkaProducer) TeamCreated(ctx context.Context, teamID, actorID, ownerID int, payload interface{}) error {
	return p.publishTeamEvent(ctx, "team.created", TeamEvent{
		EventType: "team.created",
		TeamID:    teamID,
		ActorID:   actorID,
		OwnerID:   ownerID,
		Timestamp: time.Now(),
		Payload:   payload,
	})
}

func (p *KafkaProducer) TeamUpdated(ctx context.Context, teamID, actorID, ownerID int, payload interface{}) error {
	return p.publishTeamEvent(ctx, "team.updated", TeamEvent{
		EventType: "team.updated",
		TeamID:    teamID,
		ActorID:   actorID,
		OwnerID:   ownerID,
		Timestamp: time.Now(),
		Payload:   payload,
	})
}

func (p *KafkaProducer) TeamDeleted(ctx context.Context, teamID, actorID, ownerID int, payload interface{}) error {
	return p.publishTeamEvent(ctx, "team.deleted", TeamEvent{
		EventType: "team.deleted",
		TeamID:    teamID,
		ActorID:   actorID,
		OwnerID:   ownerID,
		Timestamp: time.Now(),
		Payload:   payload,
	})
}

func (p *KafkaProducer) MemberAdded(ctx context.Context, teamID, userID, actorID int, role string, payload interface{}) error {
	return p.publishMemberEvent(ctx, "team.member_added", TeamMemberEvent{
		EventType: "team.member_added",
		TeamID:    teamID,
		UserID:    userID,
		ActorID:   actorID,
		Role:      role,
		Timestamp: time.Now(),
		Payload:   payload,
	})
}

func (p *KafkaProducer) MemberRemoved(ctx context.Context, teamID, userID, actorID int, payload interface{}) error {
	return p.publishMemberEvent(ctx, "team.member_removed", TeamMemberEvent{
		EventType: "team.member_removed",
		TeamID:    teamID,
		UserID:    userID,
		ActorID:   actorID,
		Timestamp: time.Now(),
		Payload:   payload,
	})
}

func (p *KafkaProducer) MemberRoleUpdated(ctx context.Context, teamID, userID, actorID int, role string, payload interface{}) error {
	return p.publishMemberEvent(ctx, "team.member_role_updated", TeamMemberEvent{
		EventType: "team.member_role_updated",
		TeamID:    teamID,
		UserID:    userID,
		ActorID:   actorID,
		Role:      role,
		Timestamp: time.Now(),
		Payload:   payload,
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
