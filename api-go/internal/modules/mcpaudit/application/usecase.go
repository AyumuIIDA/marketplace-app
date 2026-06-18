// Package mcpauditapp はMCPツール呼び出し監査の記録UseCaseを実装する。
package mcpauditapp

import (
	"context"

	"github.com/google/uuid"

	mcpauditdomain "marketplace/api-go/internal/modules/mcpaudit/domain"
	"marketplace/api-go/internal/shared/clock"
	"marketplace/api-go/internal/shared/ids"
)

type RecordInput struct {
	AgentID       *uuid.UUID
	UserID        uuid.UUID
	ToolName      string
	InputSummary  mcpauditdomain.JsonSummary
	OutputSummary mcpauditdomain.JsonSummary
	Status        mcpauditdomain.McpToolCallStatus
}

// RecordMcpToolCallUseCase はツール呼び出しを監査ログへ記録する。
type RecordMcpToolCallUseCase struct {
	repo  mcpauditdomain.McpToolCallRepository
	ids   ids.Generator
	clock clock.Clock
}

func NewRecordMcpToolCallUseCase(r mcpauditdomain.McpToolCallRepository, g ids.Generator, c clock.Clock) *RecordMcpToolCallUseCase {
	return &RecordMcpToolCallUseCase{repo: r, ids: g, clock: c}
}

func (uc *RecordMcpToolCallUseCase) Execute(ctx context.Context, in RecordInput) (uuid.UUID, error) {
	toolCall := mcpauditdomain.New(mcpauditdomain.CreateInput{
		ID:            uc.ids.NewID(),
		AgentID:       in.AgentID,
		UserID:        in.UserID,
		ToolName:      in.ToolName,
		InputSummary:  in.InputSummary,
		OutputSummary: in.OutputSummary,
		Status:        in.Status,
		Now:           uc.clock.Now(),
	})
	if err := uc.repo.Save(ctx, toolCall); err != nil {
		return uuid.Nil, err
	}
	return toolCall.ID(), nil
}
