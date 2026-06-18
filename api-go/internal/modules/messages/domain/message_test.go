package messagesdomain

import (
	"strings"
	"testing"
	"time"

	"github.com/google/uuid"
)

func newMsg(t *testing.T, sender, recipient uuid.UUID) *Message {
	t.Helper()
	m, err := NewMessage(CreateMessageInput{
		ID: uuid.New(), OrderID: uuid.New(), SenderID: sender, RecipientID: recipient,
		Body: "hello", Now: time.Now(),
	})
	if err != nil {
		t.Fatalf("NewMessage: %v", err)
	}
	return m
}

func TestNewMessage_RejectsSameSenderRecipient(t *testing.T) {
	u := uuid.New()
	if _, err := NewMessage(CreateMessageInput{ID: uuid.New(), OrderID: uuid.New(), SenderID: u, RecipientID: u, Body: "x", Now: time.Now()}); err == nil {
		t.Fatal("expected error when sender == recipient")
	}
}

func TestNewMessage_RejectsEmptyAndTooLongBody(t *testing.T) {
	s, r := uuid.New(), uuid.New()
	if _, err := NewMessage(CreateMessageInput{ID: uuid.New(), OrderID: uuid.New(), SenderID: s, RecipientID: r, Body: "   ", Now: time.Now()}); err == nil {
		t.Fatal("expected error for blank body")
	}
	long := strings.Repeat("a", 5001)
	if _, err := NewMessage(CreateMessageInput{ID: uuid.New(), OrderID: uuid.New(), SenderID: s, RecipientID: r, Body: long, Now: time.Now()}); err == nil {
		t.Fatal("expected error for too-long body")
	}
}

func TestHide_OnlyParticipants(t *testing.T) {
	sender, recipient := uuid.New(), uuid.New()
	m := newMsg(t, sender, recipient)
	if err := m.Hide(uuid.New(), time.Now()); err == nil {
		t.Fatal("expected error: non-participant cannot hide")
	}
	if err := m.Hide(recipient, time.Now()); err != nil {
		t.Fatalf("participant hide failed: %v", err)
	}
	if m.Status() != MessageStatusHidden || m.HiddenAt() == nil {
		t.Fatal("hide did not set hidden state")
	}
}
