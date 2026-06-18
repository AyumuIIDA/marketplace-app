package socialdomain

import (
	"testing"

	"github.com/google/uuid"

	"marketplace/api-go/internal/shared/apperr"
)

func TestEnsureCanLikeSeller(t *testing.T) {
	user := uuid.New()
	seller := uuid.New()

	if err := EnsureCanLikeSeller(user, seller); err != nil {
		t.Fatalf("liking another seller should be allowed, got %v", err)
	}

	err := EnsureCanLikeSeller(user, user)
	if err == nil {
		t.Fatal("self-like should be rejected")
	}
	ae, ok := apperr.As(err)
	if !ok || ae.Kind != apperr.KindValidation {
		t.Fatalf("self-like should be a validation error, got %v", err)
	}
}
