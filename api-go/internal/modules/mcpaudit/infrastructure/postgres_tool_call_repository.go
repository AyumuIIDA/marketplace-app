// Package mcpauditinfra はMCP監査ログのrepositoryをsqlc/pgxで実装する。
package mcpauditinfra

import (
	"context"
	"encoding/json"

	"github.com/outarc/marketplace/api-go/internal/db/pgerr"
	"github.com/outarc/marketplace/api-go/internal/db/sqlc"
	mcpauditdomain "github.com/outarc/marketplace/api-go/internal/modules/mcpaudit/domain"
	"github.com/outarc/marketplace/api-go/internal/shared/apperr"
	"github.com/outarc/marketplace/api-go/internal/shared/pgconv"
)

type PostgresMcpToolCallRepository struct {
	q *sqlc.Queries
}

func NewPostgresMcpToolCallRepository(db sqlc.DBTX) *PostgresMcpToolCallRepository {
	return &PostgresMcpToolCallRepository{q: sqlc.New(db)}
}

func (r *PostgresMcpToolCallRepository) Save(ctx context.Context, c *mcpauditdomain.McpToolCall) error {
	input, err := marshalSummary(c.InputSummary())
	if err != nil {
		return err
	}
	output, err := marshalSummary(c.OutputSummary())
	if err != nil {
		return err
	}
	if err := r.q.InsertMcpToolCall(ctx, sqlc.InsertMcpToolCallParams{
		ID:            c.ID(),
		AgentID:       c.AgentID(),
		UserID:        c.UserID(),
		ToolName:      c.ToolName(),
		InputSummary:  input,
		OutputSummary: output,
		Status:        sqlc.McpToolCallStatus(c.Status()),
		CreatedAt:     pgconv.Timestamptz(c.CreatedAt()),
	}); err != nil {
		return pgerr.FromPg(err)
	}
	return nil
}

// marshalSummary はJSON要約をjsonb用バイト列へ。nil/空はNULL(nil)。
func marshalSummary(s mcpauditdomain.JsonSummary) ([]byte, error) {
	if len(s) == 0 {
		return nil, nil
	}
	b, err := json.Marshal(s)
	if err != nil {
		return nil, apperr.Internal("failed to encode tool call summary", err)
	}
	return b, nil
}
