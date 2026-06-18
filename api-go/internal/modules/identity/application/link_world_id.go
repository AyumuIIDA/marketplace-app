package identityapp

import (
	"context"
	"time"

	"github.com/google/uuid"

	identitydomain "github.com/outarc/marketplace/api-go/internal/modules/identity/domain"
	signaturesapp "github.com/outarc/marketplace/api-go/internal/modules/signatures/application"
	"github.com/outarc/marketplace/api-go/internal/shared/apperr"
	"github.com/outarc/marketplace/api-go/internal/shared/clock"
	"github.com/outarc/marketplace/api-go/internal/shared/ids"
)

const worldIDAccountLinkAction = "ACCOUNT_LINK"

// LinkWorldIDInput は World ID 連携入力。
type LinkWorldIDInput struct {
	UserID              uuid.UUID
	IdKit               signaturesapp.IdKitResult
	ExpectedEnvironment *string
}

// LinkWorldIDResult は連携結果。
type LinkWorldIDResult struct {
	UserID          string    `json:"userId"`
	HumanVerified   bool      `json:"humanVerified"`
	HumanVerifiedAt time.Time `json:"humanVerifiedAt"`
}

// LinkWorldIDUseCase は World ID 検証を行い、ユーザーを人間性検証済みにする。
type LinkWorldIDUseCase struct {
	users         identitydomain.UserRepository
	authIdentitiy identitydomain.AuthIdentityRepository
	verifier      signaturesapp.WorldIdVerifier
	ids           ids.Generator
	clock         clock.Clock
}

func NewLinkWorldIDUseCase(users identitydomain.UserRepository, authIdentity identitydomain.AuthIdentityRepository, verifier signaturesapp.WorldIdVerifier, g ids.Generator, c clock.Clock) *LinkWorldIDUseCase {
	return &LinkWorldIDUseCase{users: users, authIdentitiy: authIdentity, verifier: verifier, ids: g, clock: c}
}

func (uc *LinkWorldIDUseCase) Execute(ctx context.Context, in LinkWorldIDInput) (LinkWorldIDResult, error) {
	user, err := uc.users.FindByID(ctx, in.UserID)
	if err != nil {
		return LinkWorldIDResult{}, err
	}
	if user == nil {
		return LinkWorldIDResult{}, apperr.NotFound("User", in.UserID.String())
	}
	if user.Status() != identitydomain.UserStatusActive {
		return LinkWorldIDResult{}, apperr.Forbidden("Only active users can link World ID.")
	}

	verified, err := uc.verifier.Verify(ctx, in.IdKit)
	if err != nil {
		return LinkWorldIDResult{}, err
	}
	if err := signaturesapp.AssertWorldIDMatchesAction(verified, worldIDAccountLinkAction, in.ExpectedEnvironment); err != nil {
		return LinkWorldIDResult{}, err
	}

	existing, err := uc.authIdentitiy.FindByProviderSubject(ctx, identitydomain.AuthProviderWorldID, verified.NullifierHash)
	if err != nil {
		return LinkWorldIDResult{}, err
	}
	if existing != nil && existing.UserID != in.UserID {
		return LinkWorldIDResult{}, apperr.Forbidden("This World ID is already linked to another user.")
	}

	now := uc.clock.Now()
	if err := uc.authIdentitiy.Save(ctx, identitydomain.AuthIdentity{
		ID:              uc.ids.NewID(),
		UserID:          in.UserID,
		Provider:        identitydomain.AuthProviderWorldID,
		ProviderSubject: verified.NullifierHash,
		CreatedAt:       now,
	}); err != nil {
		return LinkWorldIDResult{}, err
	}

	user.MarkHumanVerified(now)
	if err := uc.users.Save(ctx, user); err != nil {
		return LinkWorldIDResult{}, err
	}

	return LinkWorldIDResult{UserID: user.ID().String(), HumanVerified: true, HumanVerifiedAt: now}, nil
}
