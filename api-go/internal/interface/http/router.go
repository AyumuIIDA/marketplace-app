package httpinterface

import (
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
)

// RouterDeps はrouter構築に必要な依存。increment毎にmodule routerを足していく。
type RouterDeps struct {
	Health             HealthChecker
	TokenVerifier      TokenVerifier
	AllowDevUserHeader bool
	// RegisterAuthed は認証済みグループへmoduleルートを登録するcallback（Composition Rootが渡す）。
	RegisterAuthed func(r chi.Router)
	// RegisterPublic は認証不要のmoduleルート（例: GET /reviews）を登録する。
	RegisterPublic func(r chi.Router)
}

// NewRouter はchi routerを組み立てる。
// /health・/healthz と RegisterPublic は認証を通さない。
// それ以外のmoduleルートは AuthMiddleware 配下に置く。
func NewRouter(deps RouterDeps) http.Handler {
	r := chi.NewRouter()
	r.Use(middleware.RequestID)
	r.Use(middleware.RealIP)
	r.Use(middleware.Recoverer)

	h := healthHandler(deps.Health)
	r.Get("/health", h)
	r.Get("/healthz", h)

	if deps.RegisterPublic != nil {
		deps.RegisterPublic(r)
	}

	r.Group(func(pr chi.Router) {
		pr.Use(AuthMiddleware(deps.TokenVerifier, deps.AllowDevUserHeader))
		if deps.RegisterAuthed != nil {
			deps.RegisterAuthed(pr)
		}
	})

	return r
}
