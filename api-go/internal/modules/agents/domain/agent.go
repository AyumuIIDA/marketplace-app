// Package agentsdomain はAIエージェント(agent)のdomainモデルとrepository portを定義する。
package agentsdomain

import (
	"context"
	"strings"
	"time"

	"github.com/google/uuid"

	"marketplace/api-go/internal/shared/apperr"
)

// AgentStatus はエージェントの状態。
type AgentStatus string

const (
	AgentStatusActive   AgentStatus = "ACTIVE"
	AgentStatusDisabled AgentStatus = "DISABLED"
)

// Agent はユーザーに紐づくAIエージェントのEntity。
type Agent struct {
	id        uuid.UUID
	userID    uuid.UUID
	name      string
	status    AgentStatus
	createdAt time.Time
	updatedAt time.Time
}

type CreateAgentInput struct {
	ID     uuid.UUID
	UserID uuid.UUID
	Name   string
	Now    time.Time
}

// NewAgent は名前を検証して有効(ACTIVE)なエージェントを生成する。
func NewAgent(in CreateAgentInput) (*Agent, error) {
	if err := validateName(in.Name); err != nil {
		return nil, err
	}
	return &Agent{
		id:        in.ID,
		userID:    in.UserID,
		name:      in.Name,
		status:    AgentStatusActive,
		createdAt: in.Now,
		updatedAt: in.Now,
	}, nil
}

type RehydrateInput struct {
	ID        uuid.UUID
	UserID    uuid.UUID
	Name      string
	Status    AgentStatus
	CreatedAt time.Time
	UpdatedAt time.Time
}

func Rehydrate(in RehydrateInput) *Agent {
	return &Agent{
		id:        in.ID,
		userID:    in.UserID,
		name:      in.Name,
		status:    in.Status,
		createdAt: in.CreatedAt,
		updatedAt: in.UpdatedAt,
	}
}

func (a *Agent) ID() uuid.UUID        { return a.id }
func (a *Agent) UserID() uuid.UUID    { return a.userID }
func (a *Agent) Name() string         { return a.name }
func (a *Agent) Status() AgentStatus  { return a.status }
func (a *Agent) CreatedAt() time.Time { return a.createdAt }
func (a *Agent) UpdatedAt() time.Time { return a.updatedAt }

// Disable は所有者のみが無効化できる。
func (a *Agent) Disable(actorUserID uuid.UUID, now time.Time) error {
	if actorUserID != a.userID {
		return apperr.Domain("AGENT_OWNER_INVALID", "Only the agent owner can disable the agent.")
	}
	a.status = AgentStatusDisabled
	a.updatedAt = now
	return nil
}

func validateName(name string) error {
	trimmed := strings.TrimSpace(name)
	if trimmed == "" {
		return apperr.Domain("AGENT_NAME_REQUIRED", "Agent name is required.",
			apperr.FieldError{Field: "name", Reason: "required"})
	}
	if len([]rune(trimmed)) > 120 {
		return apperr.Domain("AGENT_NAME_TOO_LONG", "Agent name must be 120 characters or fewer.",
			apperr.FieldError{Field: "name", Reason: "too_long"})
	}
	return nil
}

// SearchInput はエージェントの有界検索条件。
type SearchInput struct {
	UserID *uuid.UUID
	Status *AgentStatus
	Limit  *int32
}

// AgentRepository はエージェントの永続化port。見つからない場合は (nil, nil)。
type AgentRepository interface {
	Save(ctx context.Context, agent *Agent) error
	FindByID(ctx context.Context, id uuid.UUID) (*Agent, error)
	Search(ctx context.Context, in SearchInput) ([]*Agent, error)
}
