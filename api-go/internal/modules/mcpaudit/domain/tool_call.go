// Package mcpauditdomain はMCPツール呼び出しの監査ログdomainモデルを定義する。
package mcpauditdomain

import (
	"context"
	"time"

	"github.com/google/uuid"
)

// McpToolCallStatus はツール呼び出しの結果状態。
type McpToolCallStatus string

const (
	StatusStarted                McpToolCallStatus = "STARTED"
	StatusSucceeded              McpToolCallStatus = "SUCCEEDED"
	StatusFailed                 McpToolCallStatus = "FAILED"
	StatusRequiresHumanSignature McpToolCallStatus = "REQUIRES_HUMAN_SIGNATURE"
	StatusRequiresConfirmation   McpToolCallStatus = "REQUIRES_CONFIRMATION"
)

// JsonSummary はツール入出力の要約（機微情報を含めない正規化済みJSON）。
type JsonSummary map[string]any

// McpToolCall はMCPツール呼び出し1回の監査記録。
type McpToolCall struct {
	id            uuid.UUID
	agentID       *uuid.UUID
	userID        uuid.UUID
	toolName      string
	inputSummary  JsonSummary
	outputSummary JsonSummary
	status        McpToolCallStatus
	createdAt     time.Time
}

type CreateInput struct {
	ID            uuid.UUID
	AgentID       *uuid.UUID
	UserID        uuid.UUID
	ToolName      string
	InputSummary  JsonSummary
	OutputSummary JsonSummary
	Status        McpToolCallStatus
	Now           time.Time
}

func New(in CreateInput) *McpToolCall {
	return &McpToolCall{
		id:            in.ID,
		agentID:       in.AgentID,
		userID:        in.UserID,
		toolName:      in.ToolName,
		inputSummary:  in.InputSummary,
		outputSummary: in.OutputSummary,
		status:        in.Status,
		createdAt:     in.Now,
	}
}

func (c *McpToolCall) ID() uuid.UUID              { return c.id }
func (c *McpToolCall) AgentID() *uuid.UUID        { return c.agentID }
func (c *McpToolCall) UserID() uuid.UUID          { return c.userID }
func (c *McpToolCall) ToolName() string           { return c.toolName }
func (c *McpToolCall) InputSummary() JsonSummary  { return c.inputSummary }
func (c *McpToolCall) OutputSummary() JsonSummary { return c.outputSummary }
func (c *McpToolCall) Status() McpToolCallStatus  { return c.status }
func (c *McpToolCall) CreatedAt() time.Time       { return c.createdAt }

// McpToolCallRepository は監査ログの永続化port。
type McpToolCallRepository interface {
	Save(ctx context.Context, toolCall *McpToolCall) error
}
