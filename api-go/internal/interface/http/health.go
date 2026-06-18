package httpinterface

import (
	"context"
	"net/http"
)

// HealthChecker はliveness/readiness確認の依存（DB ping等）。
type HealthChecker interface {
	Ping(ctx context.Context) error
}

// healthHandler は /health と /healthz を処理する。
// /health は既存フロント互換（{status:"ok"}）。/healthz はCloud Run向け別名。
func healthHandler(checker HealthChecker) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if checker != nil {
			if err := checker.Ping(r.Context()); err != nil {
				WriteJSON(w, http.StatusServiceUnavailable, map[string]string{"status": "unavailable"})
				return
			}
		}
		WriteJSON(w, http.StatusOK, map[string]string{"status": "ok"})
	}
}
