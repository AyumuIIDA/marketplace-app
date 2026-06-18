// Package httpinterface は共有HTTP境界（router・error写像・current user）を提供する。
// 宣言名を httpinterface にしてstdlib net/http との衝突とalias濫用を避ける（coding-style §5 方式B）。
package httpinterface

import (
	"encoding/json"
	"log/slog"
	"net/http"

	"github.com/outarc/marketplace/api-go/internal/shared/apperr"
)

// errorBody は既存TS実装と同形のエラーJSON: { "error": { code, message, details? } }。
// フロントの分岐互換のため形を変えない。
type errorBody struct {
	Error errorPayload `json:"error"`
}

type errorPayload struct {
	Code    string              `json:"code"`
	Message string              `json:"message"`
	Details []apperr.FieldError `json:"details,omitempty"`
}

// statusForKind はエラー分類をHTTP statusへ写像する（§15, TS契約準拠）。
func statusForKind(kind apperr.Kind) int {
	switch kind {
	case apperr.KindNotFound:
		return http.StatusNotFound
	case apperr.KindValidation, apperr.KindDomain:
		return http.StatusBadRequest
	case apperr.KindConflict:
		return http.StatusConflict
	case apperr.KindForbidden:
		return http.StatusForbidden
	case apperr.KindUnauthorized:
		return http.StatusUnauthorized
	default:
		return http.StatusInternalServerError
	}
}

// WriteJSON は任意の値をJSONで書き出す。
func WriteJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(status)
	if v != nil {
		_ = json.NewEncoder(w).Encode(v)
	}
}

// WriteError は任意のerrorをProject分類へ正規化し、安定したJSON形で返す。
// Internalは原因をサーバログにだけ出し、クライアントには漏らさない。
func WriteError(w http.ResponseWriter, r *http.Request, err error) {
	ae, ok := apperr.As(err)
	if !ok {
		ae = apperr.Internal("Internal server error.", err)
	}
	status := statusForKind(ae.Kind)

	if ae.Kind == apperr.KindInternal {
		slog.ErrorContext(r.Context(), "internal error",
			slog.String("code", ae.Code),
			slog.String("path", r.URL.Path),
			slog.String("error", ae.Error()),
		)
	}

	WriteJSON(w, status, errorBody{Error: errorPayload{
		Code:    ae.Code,
		Message: ae.Message,
		Details: ae.Details,
	}})
}
