// Package identityapp はidentityのUseCase（現在ユーザー取得・更新）を実装する。
package identityapp

import (
	"context"
	"time"

	"github.com/google/uuid"

	identitydomain "github.com/outarc/marketplace/api-go/internal/modules/identity/domain"
	"github.com/outarc/marketplace/api-go/internal/shared/apperr"
	"github.com/outarc/marketplace/api-go/internal/shared/clock"
)

// UserView は現在ユーザーの表現（GET/PUT /me 応答）。
// 既存フロント互換のためcamelCaseキーを維持する。
type UserView struct {
	UserID          string     `json:"userId"`
	DisplayName     string     `json:"displayName"`
	Email           *string    `json:"email,omitempty"`
	AvatarURL       *string    `json:"avatarUrl,omitempty"`
	Status          string     `json:"status"`
	HumanVerified   bool       `json:"humanVerified"`
	HumanVerifiedAt *time.Time `json:"humanVerifiedAt,omitempty"`
}

func presentUser(u *identitydomain.User) UserView {
	return UserView{
		UserID:          u.ID().String(),
		DisplayName:     u.DisplayName(),
		Email:           u.Email(),
		AvatarURL:       u.AvatarURL(),
		Status:          string(u.Status()),
		HumanVerified:   u.HumanVerified(),
		HumanVerifiedAt: u.HumanVerifiedAt(),
	}
}

// --- GetCurrentUser ---

type GetCurrentUserUseCase struct {
	users identitydomain.UserRepository
}

func NewGetCurrentUserUseCase(users identitydomain.UserRepository) *GetCurrentUserUseCase {
	return &GetCurrentUserUseCase{users: users}
}

func (uc *GetCurrentUserUseCase) Execute(ctx context.Context, userID uuid.UUID) (UserView, error) {
	user, err := uc.users.FindByID(ctx, userID)
	if err != nil {
		return UserView{}, err
	}
	if user == nil {
		return UserView{}, apperr.NotFound("User", userID.String())
	}
	if user.Status() != identitydomain.UserStatusActive {
		return UserView{}, apperr.Forbidden("Current user is not active.")
	}
	return presentUser(user), nil
}

// --- UpsertCurrentUser ---

type UpsertCurrentUserInput struct {
	UserID      uuid.UUID
	DisplayName string
	Email       string
	AvatarURL   *string
}

// UpsertResult は PUT /me の応答（既存TS互換: userId/status のみ）。
type UpsertResult struct {
	UserID string `json:"userId"`
	Status string `json:"status"`
}

type UpsertCurrentUserUseCase struct {
	users identitydomain.UserRepository
	clock clock.Clock
}

func NewUpsertCurrentUserUseCase(users identitydomain.UserRepository, c clock.Clock) *UpsertCurrentUserUseCase {
	return &UpsertCurrentUserUseCase{users: users, clock: c}
}

func (uc *UpsertCurrentUserUseCase) Execute(ctx context.Context, in UpsertCurrentUserInput) (UpsertResult, error) {
	now := uc.clock.Now()
	email := in.Email

	existing, err := uc.users.FindByID(ctx, in.UserID)
	if err != nil {
		return UpsertResult{}, err
	}

	if existing != nil {
		if err := existing.UpdateProfile(in.DisplayName, &email, in.AvatarURL, now); err != nil {
			return UpsertResult{}, err
		}
		if err := uc.users.Save(ctx, existing); err != nil {
			return UpsertResult{}, err
		}
		return UpsertResult{UserID: existing.ID().String(), Status: string(existing.Status())}, nil
	}

	user, err := identitydomain.NewUser(identitydomain.CreateUserInput{
		ID:          in.UserID,
		DisplayName: in.DisplayName,
		Email:       &email,
		AvatarURL:   in.AvatarURL,
		Now:         now,
	})
	if err != nil {
		return UpsertResult{}, err
	}
	if err := uc.users.Save(ctx, user); err != nil {
		return UpsertResult{}, err
	}
	return UpsertResult{UserID: user.ID().String(), Status: string(user.Status())}, nil
}
