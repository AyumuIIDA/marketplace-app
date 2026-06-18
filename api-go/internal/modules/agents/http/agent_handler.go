// Package agentshttp はエージェント管理のHTTP adapter（/agents 系）。
package agentshttp

import (
	"net/http"
	"strings"

	"github.com/go-chi/chi/v5"

	"github.com/outarc/marketplace/api-go/internal/app/workflows"
	httpinterface "github.com/outarc/marketplace/api-go/internal/interface/http"
	agentsapp "github.com/outarc/marketplace/api-go/internal/modules/agents/application"
	agentsdomain "github.com/outarc/marketplace/api-go/internal/modules/agents/domain"
	"github.com/outarc/marketplace/api-go/internal/shared/apperr"
)

// Deps はエージェントHTTPの依存。runs(エージェント実行)はMCP gateway依存の orchestration workflow。
type Deps struct {
	Create      *agentsapp.CreateAgentUseCase
	List        *agentsapp.ListAgentsUseCase
	Disable     *agentsapp.DisableAgentUseCase
	RunDiscover *workflows.RunDiscoverAgentWorkflow
}

// RegisterRoutes は /agents 系を認証済みグループへ登録する。
func RegisterRoutes(r chi.Router, deps Deps) {
	r.Route("/agents", func(ar chi.Router) {
		ar.Get("/", deps.handleList)
		ar.Post("/", deps.handleCreate)
		ar.Post("/runs", deps.handleRun)
		ar.Post("/{agentId}/disable", deps.handleDisable)
	})
}

type runDiscoverMessage struct {
	Role    string `json:"role" validate:"required,oneof=user assistant"`
	Content string `json:"content" validate:"required,min=1,max=2000"`
}

type runDiscoverRequest struct {
	AgentID  *string              `json:"agentId" validate:"omitempty,min=1"`
	Message  string               `json:"message" validate:"required,min=1,max=2000"`
	Messages []runDiscoverMessage `json:"messages" validate:"omitempty,max=12,dive"`
}

func (deps Deps) handleRun(w http.ResponseWriter, r *http.Request) {
	userID, err := httpinterface.CurrentUserID(r)
	if err != nil {
		httpinterface.WriteError(w, r, err)
		return
	}
	var body runDiscoverRequest
	if err := httpinterface.DecodeJSON(r, &body); err != nil {
		httpinterface.WriteError(w, r, err)
		return
	}

	var agentID *string
	if body.AgentID != nil {
		if trimmed := strings.TrimSpace(*body.AgentID); trimmed != "" {
			agentID = &trimmed
		}
	}
	messages := make([]agentsapp.DiscoverMessage, 0, len(body.Messages))
	for _, m := range body.Messages {
		messages = append(messages, agentsapp.DiscoverMessage{Role: m.Role, Content: m.Content})
	}

	out, err := deps.RunDiscover.Execute(r.Context(), workflows.RunDiscoverAgentInput{
		UserID:   userID.String(),
		AgentID:  agentID,
		Message:  strings.TrimSpace(body.Message),
		Messages: messages,
	})
	if err != nil {
		httpinterface.WriteError(w, r, err)
		return
	}
	httpinterface.WriteJSON(w, http.StatusOK, out)
}

func (deps Deps) handleList(w http.ResponseWriter, r *http.Request) {
	userID, err := httpinterface.CurrentUserID(r)
	if err != nil {
		httpinterface.WriteError(w, r, err)
		return
	}
	status, err := optionalAgentStatus(r.URL.Query().Get("status"))
	if err != nil {
		httpinterface.WriteError(w, r, err)
		return
	}
	limit, err := httpinterface.OptionalLimit(r.URL.Query().Get("limit"))
	if err != nil {
		httpinterface.WriteError(w, r, err)
		return
	}
	out, err := deps.List.Execute(r.Context(), agentsapp.ListAgentsInput{UserID: userID, Status: status, Limit: limit})
	if err != nil {
		httpinterface.WriteError(w, r, err)
		return
	}
	httpinterface.WriteJSON(w, http.StatusOK, out)
}

type createAgentRequest struct {
	Name string `json:"name" validate:"required,max=120"`
}

func (deps Deps) handleCreate(w http.ResponseWriter, r *http.Request) {
	userID, err := httpinterface.CurrentUserID(r)
	if err != nil {
		httpinterface.WriteError(w, r, err)
		return
	}
	var body createAgentRequest
	if err := httpinterface.DecodeJSON(r, &body); err != nil {
		httpinterface.WriteError(w, r, err)
		return
	}
	out, err := deps.Create.Execute(r.Context(), userID, strings.TrimSpace(body.Name))
	if err != nil {
		httpinterface.WriteError(w, r, err)
		return
	}
	httpinterface.WriteJSON(w, http.StatusCreated, out)
}

func (deps Deps) handleDisable(w http.ResponseWriter, r *http.Request) {
	userID, err := httpinterface.CurrentUserID(r)
	if err != nil {
		httpinterface.WriteError(w, r, err)
		return
	}
	agentID, err := httpinterface.PathUUID(r, "agentId", "Agent")
	if err != nil {
		httpinterface.WriteError(w, r, err)
		return
	}
	out, err := deps.Disable.Execute(r.Context(), agentID, userID)
	if err != nil {
		httpinterface.WriteError(w, r, err)
		return
	}
	httpinterface.WriteJSON(w, http.StatusOK, out)
}

func optionalAgentStatus(s string) (*agentsdomain.AgentStatus, error) {
	if s == "" {
		return nil, nil
	}
	switch agentsdomain.AgentStatus(s) {
	case agentsdomain.AgentStatusActive, agentsdomain.AgentStatusDisabled:
		st := agentsdomain.AgentStatus(s)
		return &st, nil
	default:
		return nil, apperr.Validation("status is invalid.", apperr.FieldError{Field: "status", Reason: "enum"})
	}
}
