package mcpinterface

import (
	"context"
	"log/slog"

	"github.com/google/uuid"

	mcpauditapp "marketplace/api-go/internal/modules/mcpaudit/application"
	mcpauditdomain "marketplace/api-go/internal/modules/mcpaudit/domain"
)

// ToolRunner は全tool呼び出しを実行し、mcp_tool_callsへ監査記録する。
// 監査記録の失敗はtool結果に影響させない（best-effort）。
type ToolRunner struct {
	record *mcpauditapp.RecordMcpToolCallUseCase
}

func NewToolRunner(record *mcpauditapp.RecordMcpToolCallUseCase) *ToolRunner {
	return &ToolRunner{record: record}
}

// Run はtoolを実行し、入出力要約とともに監査記録する。executeのerrorはFAILEDへ正規化する。
func (r *ToolRunner) Run(ctx context.Context, tool McpTool, input map[string]any, toolCtx ToolContext) ToolResult {
	result, err := tool.Execute(ctx, input, toolCtx)
	if err != nil {
		result = Failed(err)
	}
	r.audit(ctx, tool.Name(), input, result, toolCtx)
	return result
}

func (r *ToolRunner) audit(ctx context.Context, toolName string, input map[string]any, result ToolResult, toolCtx ToolContext) {
	userID, err := uuid.Parse(toolCtx.UserID)
	if err != nil {
		return // 主体が不正なら記録しない（toolは既に結果を返している）
	}
	var agentID *uuid.UUID
	if toolCtx.AgentID != nil {
		if id, perr := uuid.Parse(*toolCtx.AgentID); perr == nil {
			agentID = &id
		}
	}
	if _, err := r.record.Execute(ctx, mcpauditapp.RecordInput{
		AgentID:       agentID,
		UserID:        userID,
		ToolName:      toolName,
		InputSummary:  summarizeInput(input),
		OutputSummary: summarizeResult(result),
		Status:        mcpauditdomain.McpToolCallStatus(result.Status),
	}); err != nil {
		slog.WarnContext(ctx, "mcp tool call audit failed", slog.String("tool", toolName), slog.String("error", err.Error()))
	}
}

// summarizeInput は機微情報を落とした入力要約を作る（idKitResultはredact、本文は長さのみ）。
func summarizeInput(input map[string]any) mcpauditdomain.JsonSummary {
	summary := make(mcpauditdomain.JsonSummary, len(input))
	for k, v := range input {
		switch k {
		case "idKitResult":
			summary[k] = "[redacted]"
		case "body", "comment", "description":
			if s, ok := v.(string); ok {
				summary[k+"Length"] = len(s)
			}
		default:
			summary[k] = v
		}
	}
	return summary
}

func summarizeResult(result ToolResult) mcpauditdomain.JsonSummary {
	s := mcpauditdomain.JsonSummary{"status": string(result.Status)}
	if result.Status == ToolFailed && result.Error != nil {
		s["errorCode"] = result.Error.Code
	}
	return s
}
