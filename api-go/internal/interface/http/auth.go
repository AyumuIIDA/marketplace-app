package httpinterface

import (
	"context"
	"net/http"
	"strings"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"

	"github.com/outarc/marketplace/api-go/internal/shared/apperr"
)

// CurrentUser はBFFが確定した認証主体。APIは検証のみ行う。
type CurrentUser struct {
	UserID    string
	SessionID string
}

// TokenVerifier はBearerトークン（BFF内部JWT, EdDSA）の検証port。
type TokenVerifier interface {
	Verify(token string) (CurrentUser, error)
}

type ctxKey int

const currentUserKey ctxKey = iota

// AuthMiddleware はBearer検証 or dev headerでCurrentUserを確定しcontextへ格納する。
// 失敗時は安定したJSONエラーを返してチェーンを止める。
func AuthMiddleware(verifier TokenVerifier, allowDevUserHeader bool) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			authorization := r.Header.Get("Authorization")

			if authorization != "" {
				token, err := readBearerToken(authorization)
				if err != nil {
					WriteError(w, r, err)
					return
				}
				if verifier == nil {
					// 設定ミスは認証失敗(401)ではなくサーバ設定エラー(500)。
					WriteError(w, r, apperr.Infrastructure("BFF token public key is not configured", nil))
					return
				}
				cu, err := verifier.Verify(token)
				if err != nil {
					WriteError(w, r, err)
					return
				}
				next.ServeHTTP(w, r.WithContext(withCurrentUser(r.Context(), cu)))
				return
			}

			if allowDevUserHeader {
				if userID := strings.TrimSpace(r.Header.Get("X-User-Id")); userID != "" {
					next.ServeHTTP(w, r.WithContext(withCurrentUser(r.Context(), CurrentUser{UserID: userID})))
					return
				}
			}

			WriteError(w, r, apperr.Unauthorized("Authentication is required."))
		})
	}
}

func withCurrentUser(ctx context.Context, cu CurrentUser) context.Context {
	return context.WithValue(ctx, currentUserKey, cu)
}

// CurrentUserFrom はcontextからCurrentUserを取り出す。未設定なら未認証エラー。
func CurrentUserFrom(ctx context.Context) (CurrentUser, error) {
	cu, ok := ctx.Value(currentUserKey).(CurrentUser)
	if !ok || cu.UserID == "" {
		return CurrentUser{}, apperr.Unauthorized("Authentication is required.")
	}
	return cu, nil
}

// CurrentUserID はcontextのCurrentUserからuuidを得る。
// subがuuidでなければ該当ユーザーは存在し得ないためNotFound(404)に正規化する。
// 全moduleのHTTP adapterで共有する（重複実装を避ける）。
func CurrentUserID(r *http.Request) (uuid.UUID, error) {
	cu, err := CurrentUserFrom(r.Context())
	if err != nil {
		return uuid.Nil, err
	}
	id, perr := uuid.Parse(cu.UserID)
	if perr != nil {
		return uuid.Nil, apperr.NotFound("User", cu.UserID)
	}
	return id, nil
}

// PathUUID はpath paramをuuidとして解釈する。非uuidは「不在」と同義としてNotFound(404)に正規化する。
// resourceLabel は NotFound メッセージのリソース名（例: "Listing", "Order"）。
func PathUUID(r *http.Request, key, resourceLabel string) (uuid.UUID, error) {
	raw := chi.URLParam(r, key)
	id, err := uuid.Parse(raw)
	if err != nil {
		return uuid.Nil, apperr.NotFound(resourceLabel, raw)
	}
	return id, nil
}

func readBearerToken(authorization string) (string, error) {
	parts := strings.SplitN(authorization, " ", 2)
	if len(parts) != 2 || parts[0] != "Bearer" || strings.TrimSpace(parts[1]) == "" {
		return "", apperr.Unauthorized("Authorization header must use the Bearer scheme.")
	}
	return strings.TrimSpace(parts[1]), nil
}
