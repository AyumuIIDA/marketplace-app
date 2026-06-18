package mcpinterface

import (
	"encoding/json"
	"strings"

	"github.com/google/uuid"

	signaturesapp "marketplace/api-go/internal/modules/signatures/application"
	"marketplace/api-go/internal/shared/apperr"
)

// toIdKit は args["idKitResult"](ネストobject)を IdKitResult へ再構築する。
// 2番目の戻り値は idKitResult が存在したか。
func toIdKit(m map[string]any) (signaturesapp.IdKitResult, bool) {
	raw, ok := m["idKitResult"]
	if !ok || raw == nil {
		return signaturesapp.IdKitResult{}, false
	}
	b, err := json.Marshal(raw)
	if err != nil {
		return signaturesapp.IdKitResult{}, false
	}
	var idk signaturesapp.IdKitResult
	if err := json.Unmarshal(b, &idk); err != nil {
		return signaturesapp.IdKitResult{}, false
	}
	return idk, true
}

// JSON由来の map[string]any から型付き値を取り出すヘルパ。
// JSON数値はfloat64で来る前提。

func argStr(m map[string]any, k string) *string {
	if v, ok := m[k].(string); ok && strings.TrimSpace(v) != "" {
		t := strings.TrimSpace(v)
		return &t
	}
	return nil
}

func argStrRaw(m map[string]any, k string) string {
	if v, ok := m[k].(string); ok {
		return v
	}
	return ""
}

func argInt32(m map[string]any, k string) *int32 {
	switch v := m[k].(type) {
	case float64:
		n := int32(v)
		return &n
	case int:
		n := int32(v)
		return &n
	}
	return nil
}

func argBool(m map[string]any, k string) bool {
	b, _ := m[k].(bool)
	return b
}

func argStrSlice(m map[string]any, k string) []string {
	raw, ok := m[k].([]any)
	if !ok {
		return nil
	}
	out := make([]string, 0, len(raw))
	for _, v := range raw {
		if s, ok := v.(string); ok {
			out = append(out, s)
		}
	}
	return out
}

func argUUIDSlice(m map[string]any, k, resourceLabel string) ([]uuid.UUID, error) {
	raw := argStrSlice(m, k)
	out := make([]uuid.UUID, 0, len(raw))
	for _, s := range raw {
		id, err := uuid.Parse(s)
		if err != nil {
			return nil, apperr.NotFound(resourceLabel, s)
		}
		out = append(out, id)
	}
	return out, nil
}

// argUUIDReq は必須uuid引数を取り出す。不正なら resourceLabel でNotFoundエラー。
func argUUIDReq(m map[string]any, k, resourceLabel string) (uuid.UUID, error) {
	id, err := uuid.Parse(argStrRaw(m, k))
	if err != nil {
		return uuid.Nil, apperr.NotFound(resourceLabel, argStrRaw(m, k))
	}
	return id, nil
}

// requireUserID は ToolContext の userId を uuid 化する（BFFが確定済み）。
func requireUserID(toolCtx ToolContext) (uuid.UUID, error) {
	id, err := uuid.Parse(toolCtx.UserID)
	if err != nil {
		return uuid.Nil, apperr.Unauthorized("Authentication is required.")
	}
	return id, nil
}

// agentUUID は ToolContext の agentId(任意)を uuid 化する。
func agentUUID(toolCtx ToolContext) (*uuid.UUID, error) {
	if toolCtx.AgentID == nil {
		return nil, nil
	}
	id, err := uuid.Parse(*toolCtx.AgentID)
	if err != nil {
		return nil, apperr.Validation("agentId must be a valid id.", apperr.FieldError{Field: "agentId", Reason: "invalid"})
	}
	return &id, nil
}
