package agentsdomain

import (
	"strings"
	"testing"
	"time"

	"github.com/google/uuid"
)

func TestNewAgent_Valid(t *testing.T) {
	a, err := NewAgent(CreateAgentInput{ID: uuid.New(), UserID: uuid.New(), Name: "Bot", Now: time.Now()})
	if err != nil {
		t.Fatal(err)
	}
	if a.Status() != AgentStatusActive {
		t.Errorf("status = %s", a.Status())
	}
}

func TestNewAgent_RejectsEmptyAndTooLong(t *testing.T) {
	if _, err := NewAgent(CreateAgentInput{ID: uuid.New(), UserID: uuid.New(), Name: "   ", Now: time.Now()}); err == nil {
		t.Fatal("expected empty name rejection")
	}
	if _, err := NewAgent(CreateAgentInput{ID: uuid.New(), UserID: uuid.New(), Name: strings.Repeat("x", 121), Now: time.Now()}); err == nil {
		t.Fatal("expected too-long name rejection")
	}
}

func TestDisable_OnlyOwner(t *testing.T) {
	owner := uuid.New()
	a, _ := NewAgent(CreateAgentInput{ID: uuid.New(), UserID: owner, Name: "Bot", Now: time.Now()})
	if err := a.Disable(uuid.New(), time.Now()); err == nil {
		t.Fatal("expected non-owner disable rejection")
	}
	if err := a.Disable(owner, time.Now()); err != nil {
		t.Fatalf("owner disable: %v", err)
	}
	if a.Status() != AgentStatusDisabled {
		t.Errorf("status = %s, want DISABLED", a.Status())
	}
}
