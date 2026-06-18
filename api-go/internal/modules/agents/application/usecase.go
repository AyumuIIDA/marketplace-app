// Package agentsapp はエージェント管理のUseCaseを実装する。
package agentsapp

import (
	"context"
	"time"

	"github.com/google/uuid"

	agentsdomain "marketplace/api-go/internal/modules/agents/domain"
	"marketplace/api-go/internal/shared/apperr"
	"marketplace/api-go/internal/shared/clock"
	"marketplace/api-go/internal/shared/ids"
)

// AgentView はエージェントの応答表現（既存フロント互換のcamelCase）。
type AgentView struct {
	AgentID   string    `json:"agentId"`
	UserID    string    `json:"userId"`
	Name      string    `json:"name"`
	Status    string    `json:"status"`
	CreatedAt time.Time `json:"createdAt"`
	UpdatedAt time.Time `json:"updatedAt"`
}

func PresentAgent(a *agentsdomain.Agent) AgentView {
	return AgentView{
		AgentID:   a.ID().String(),
		UserID:    a.UserID().String(),
		Name:      a.Name(),
		Status:    string(a.Status()),
		CreatedAt: a.CreatedAt(),
		UpdatedAt: a.UpdatedAt(),
	}
}

// --- CreateAgent ---

type CreateAgentUseCase struct {
	repo  agentsdomain.AgentRepository
	ids   ids.Generator
	clock clock.Clock
}

func NewCreateAgentUseCase(r agentsdomain.AgentRepository, g ids.Generator, c clock.Clock) *CreateAgentUseCase {
	return &CreateAgentUseCase{repo: r, ids: g, clock: c}
}

func (uc *CreateAgentUseCase) Execute(ctx context.Context, userID uuid.UUID, name string) (AgentView, error) {
	agent, err := agentsdomain.NewAgent(agentsdomain.CreateAgentInput{
		ID: uc.ids.NewID(), UserID: userID, Name: name, Now: uc.clock.Now(),
	})
	if err != nil {
		return AgentView{}, err
	}
	if err := uc.repo.Save(ctx, agent); err != nil {
		return AgentView{}, err
	}
	return PresentAgent(agent), nil
}

// --- ListAgents ---

type ListAgentsInput struct {
	UserID uuid.UUID
	Status *agentsdomain.AgentStatus
	Limit  *int32
}

type ListAgentsResult struct {
	Items []AgentView `json:"items"`
}

type ListAgentsUseCase struct {
	repo agentsdomain.AgentRepository
}

func NewListAgentsUseCase(r agentsdomain.AgentRepository) *ListAgentsUseCase {
	return &ListAgentsUseCase{repo: r}
}

func (uc *ListAgentsUseCase) Execute(ctx context.Context, in ListAgentsInput) (ListAgentsResult, error) {
	uid := in.UserID
	agents, err := uc.repo.Search(ctx, agentsdomain.SearchInput{UserID: &uid, Status: in.Status, Limit: in.Limit})
	if err != nil {
		return ListAgentsResult{}, err
	}
	items := make([]AgentView, 0, len(agents))
	for _, a := range agents {
		items = append(items, PresentAgent(a))
	}
	return ListAgentsResult{Items: items}, nil
}

// --- DisableAgent ---

type DisableAgentUseCase struct {
	repo  agentsdomain.AgentRepository
	clock clock.Clock
}

func NewDisableAgentUseCase(r agentsdomain.AgentRepository, c clock.Clock) *DisableAgentUseCase {
	return &DisableAgentUseCase{repo: r, clock: c}
}

func (uc *DisableAgentUseCase) Execute(ctx context.Context, agentID, userID uuid.UUID) (AgentView, error) {
	agent, err := uc.repo.FindByID(ctx, agentID)
	if err != nil {
		return AgentView{}, err
	}
	if agent == nil {
		return AgentView{}, apperr.NotFound("Agent", agentID.String())
	}
	if err := agent.Disable(userID, uc.clock.Now()); err != nil {
		return AgentView{}, err
	}
	if err := uc.repo.Save(ctx, agent); err != nil {
		return AgentView{}, err
	}
	return PresentAgent(agent), nil
}
