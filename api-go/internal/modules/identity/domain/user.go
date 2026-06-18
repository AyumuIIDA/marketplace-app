// Package identitydomain はユーザー(identity)のdomainモデルとrepository portを定義する。
package identitydomain

import (
	"context"
	"strings"
	"time"

	"github.com/google/uuid"

	"marketplace/api-go/internal/shared/apperr"
)

// UserStatus はユーザーの状態。
type UserStatus string

const (
	UserStatusActive    UserStatus = "ACTIVE"
	UserStatusSuspended UserStatus = "SUSPENDED"
)

// User はidentityのEntity。不変条件はここで検証し、状態遷移はmethodで表す。
type User struct {
	id              uuid.UUID
	displayName     string
	email           *string
	avatarURL       *string
	status          UserStatus
	humanVerifiedAt *time.Time
	createdAt       time.Time
	updatedAt       time.Time
}

// CreateUserInput は新規ユーザー生成の入力。
type CreateUserInput struct {
	ID          uuid.UUID
	DisplayName string
	Email       *string
	AvatarURL   *string
	Now         time.Time
}

// NewUser は不変条件を検証して新規ユーザーを生成する（status=ACTIVE）。
func NewUser(in CreateUserInput) (*User, error) {
	if err := validateDisplayName(in.DisplayName); err != nil {
		return nil, err
	}
	if err := validateOptionalEmail(in.Email); err != nil {
		return nil, err
	}
	return &User{
		id:          in.ID,
		displayName: in.DisplayName,
		email:       in.Email,
		avatarURL:   in.AvatarURL,
		status:      UserStatusActive,
		createdAt:   in.Now,
		updatedAt:   in.Now,
	}, nil
}

// RehydrateUser はDB行から状態を復元する（検証なし）。
type RehydrateUserInput struct {
	ID              uuid.UUID
	DisplayName     string
	Email           *string
	AvatarURL       *string
	Status          UserStatus
	HumanVerifiedAt *time.Time
	CreatedAt       time.Time
	UpdatedAt       time.Time
}

func RehydrateUser(in RehydrateUserInput) *User {
	return &User{
		id:              in.ID,
		displayName:     in.DisplayName,
		email:           in.Email,
		avatarURL:       in.AvatarURL,
		status:          in.Status,
		humanVerifiedAt: in.HumanVerifiedAt,
		createdAt:       in.CreatedAt,
		updatedAt:       in.UpdatedAt,
	}
}

func (u *User) ID() uuid.UUID               { return u.id }
func (u *User) DisplayName() string         { return u.displayName }
func (u *User) Email() *string              { return u.email }
func (u *User) AvatarURL() *string          { return u.avatarURL }
func (u *User) Status() UserStatus          { return u.status }
func (u *User) HumanVerifiedAt() *time.Time { return u.humanVerifiedAt }
func (u *User) HumanVerified() bool         { return u.humanVerifiedAt != nil }
func (u *User) CreatedAt() time.Time        { return u.createdAt }
func (u *User) UpdatedAt() time.Time        { return u.updatedAt }

// UpdateProfile はプロフィールを更新する。不変条件を再検証する。
func (u *User) UpdateProfile(displayName string, email, avatarURL *string, now time.Time) error {
	if err := validateDisplayName(displayName); err != nil {
		return err
	}
	if err := validateOptionalEmail(email); err != nil {
		return err
	}
	u.displayName = displayName
	u.email = email
	u.avatarURL = avatarURL
	u.updatedAt = now
	return nil
}

// MarkHumanVerified はWorld ID連携の成立で人間性検証済みにする。
func (u *User) MarkHumanVerified(now time.Time) {
	u.humanVerifiedAt = &now
	u.updatedAt = now
}

func validateDisplayName(value string) error {
	if strings.TrimSpace(value) == "" {
		return apperr.Domain("USER_FIELD_REQUIRED", "displayName is required.",
			apperr.FieldError{Field: "displayName", Reason: "required"})
	}
	return nil
}

func validateOptionalEmail(email *string) error {
	if email == nil {
		return nil
	}
	v := strings.TrimSpace(*email)
	if v == "" || !strings.Contains(v, "@") {
		return apperr.Domain("USER_EMAIL_INVALID", "User email is invalid.",
			apperr.FieldError{Field: "email", Reason: "invalid"})
	}
	return nil
}

// UserRepository はユーザーの永続化port。見つからない場合は (nil, nil)。
type UserRepository interface {
	Save(ctx context.Context, user *User) error
	FindByID(ctx context.Context, id uuid.UUID) (*User, error)
	FindByEmail(ctx context.Context, email string) (*User, error)
}
