// Package agentsinfra はエージェントのrepositoryをsqlc/pgxで実装する。
package agentsinfra

import (
	"context"
	"errors"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"

	"github.com/outarc/marketplace/api-go/internal/db/pgerr"
	"github.com/outarc/marketplace/api-go/internal/db/sqlc"
	agentsdomain "github.com/outarc/marketplace/api-go/internal/modules/agents/domain"
	"github.com/outarc/marketplace/api-go/internal/shared/apperr"
	"github.com/outarc/marketplace/api-go/internal/shared/pgconv"
)

type PostgresAgentRepository struct {
	q *sqlc.Queries
}

func NewPostgresAgentRepository(db sqlc.DBTX) *PostgresAgentRepository {
	return &PostgresAgentRepository{q: sqlc.New(db)}
}

func (r *PostgresAgentRepository) Save(ctx context.Context, a *agentsdomain.Agent) error {
	err := r.q.UpsertAgent(ctx, sqlc.UpsertAgentParams{
		ID:        a.ID(),
		UserID:    a.UserID(),
		Name:      a.Name(),
		Status:    sqlc.AgentStatus(a.Status()),
		CreatedAt: pgconv.Timestamptz(a.CreatedAt()),
		UpdatedAt: pgconv.Timestamptz(a.UpdatedAt()),
	})
	if err != nil {
		return pgerr.FromPg(err)
	}
	return nil
}

func (r *PostgresAgentRepository) FindByID(ctx context.Context, id uuid.UUID) (*agentsdomain.Agent, error) {
	row, err := r.q.GetAgentByID(ctx, id)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil
		}
		mapped := pgerr.FromPg(err)
		if apperr.IsNotFound(mapped) {
			return nil, nil
		}
		return nil, mapped
	}
	return mapAgentRow(row), nil
}

func (r *PostgresAgentRepository) Search(ctx context.Context, in agentsdomain.SearchInput) ([]*agentsdomain.Agent, error) {
	var status *sqlc.AgentStatus
	if in.Status != nil {
		s := sqlc.AgentStatus(*in.Status)
		status = &s
	}
	limit := int32(50)
	if in.Limit != nil {
		limit = *in.Limit
	}
	rows, err := r.q.SearchAgents(ctx, sqlc.SearchAgentsParams{
		UserID:      in.UserID,
		Status:      status,
		ResultLimit: limit,
	})
	if err != nil {
		return nil, pgerr.FromPg(err)
	}
	out := make([]*agentsdomain.Agent, 0, len(rows))
	for _, row := range rows {
		out = append(out, mapAgentRow(row))
	}
	return out, nil
}

func mapAgentRow(row sqlc.Agent) *agentsdomain.Agent {
	return agentsdomain.Rehydrate(agentsdomain.RehydrateInput{
		ID:        row.ID,
		UserID:    row.UserID,
		Name:      row.Name,
		Status:    agentsdomain.AgentStatus(row.Status),
		CreatedAt: pgconv.Time(row.CreatedAt),
		UpdatedAt: pgconv.Time(row.UpdatedAt),
	})
}
