package identitydomain

import (
	"context"
	"time"

	"github.com/google/uuid"
)

// AuthProviderWorldID はWorld IDを認証プロバイダとして表す識別子。
const AuthProviderWorldID = "world_id"

// AuthIdentity は外部認証プロバイダとユーザーの紐づけ。
type AuthIdentity struct {
	ID              uuid.UUID
	UserID          uuid.UUID
	Provider        string
	ProviderSubject string
	CreatedAt       time.Time
}

// AuthIdentityRepository は認証アイデンティティの永続化port。見つからない場合は (nil, nil)。
type AuthIdentityRepository interface {
	Save(ctx context.Context, identity AuthIdentity) error
	FindByProviderSubject(ctx context.Context, provider, providerSubject string) (*AuthIdentity, error)
}
