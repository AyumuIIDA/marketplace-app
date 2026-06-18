package identitydomain

import (
	"testing"
	"time"

	"github.com/google/uuid"
)

func ptr(s string) *string { return &s }

func TestNewUser_Valid(t *testing.T) {
	now := time.Now()
	u, err := NewUser(CreateUserInput{
		ID:          uuid.New(),
		DisplayName: "Aoi",
		Email:       ptr("aoi@example.com"),
		Now:         now,
	})
	if err != nil {
		t.Fatalf("NewUser: %v", err)
	}
	if u.Status() != UserStatusActive {
		t.Errorf("status = %s, want ACTIVE", u.Status())
	}
	if u.HumanVerified() {
		t.Error("new user must not be human-verified")
	}
}

func TestNewUser_RejectsEmptyDisplayName(t *testing.T) {
	if _, err := NewUser(CreateUserInput{ID: uuid.New(), DisplayName: "   ", Now: time.Now()}); err == nil {
		t.Fatal("expected error for blank displayName")
	}
}

func TestNewUser_RejectsInvalidEmail(t *testing.T) {
	if _, err := NewUser(CreateUserInput{ID: uuid.New(), DisplayName: "Aoi", Email: ptr("not-an-email"), Now: time.Now()}); err == nil {
		t.Fatal("expected error for invalid email")
	}
}

func TestUser_MarkHumanVerified(t *testing.T) {
	u, _ := NewUser(CreateUserInput{ID: uuid.New(), DisplayName: "Aoi", Now: time.Now()})
	verifiedAt := time.Now().Add(time.Minute)
	u.MarkHumanVerified(verifiedAt)
	if !u.HumanVerified() {
		t.Fatal("expected human-verified")
	}
	if got := u.HumanVerifiedAt(); got == nil || !got.Equal(verifiedAt) {
		t.Errorf("humanVerifiedAt = %v, want %v", got, verifiedAt)
	}
}

func TestUser_UpdateProfile(t *testing.T) {
	u, _ := NewUser(CreateUserInput{ID: uuid.New(), DisplayName: "Aoi", Now: time.Now()})
	later := time.Now().Add(time.Hour)
	if err := u.UpdateProfile("Aoi Tanaka", ptr("aoi@example.com"), nil, later); err != nil {
		t.Fatalf("UpdateProfile: %v", err)
	}
	if u.DisplayName() != "Aoi Tanaka" {
		t.Errorf("displayName = %q", u.DisplayName())
	}
	if !u.UpdatedAt().Equal(later) {
		t.Errorf("updatedAt not advanced")
	}
}
