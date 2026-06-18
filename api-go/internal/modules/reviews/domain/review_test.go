package reviewsdomain

import (
	"testing"
	"time"

	"github.com/google/uuid"
)

func draft(t *testing.T, reviewer, reviewee uuid.UUID, rating int32, comment string) (*Review, error) {
	t.Helper()
	return NewDraft(CreateDraftReviewInput{
		ID: uuid.New(), OrderID: uuid.New(), ReviewerID: reviewer, RevieweeID: reviewee,
		Rating: rating, Comment: comment, Now: time.Now(),
	})
}

func TestNewDraft_RejectsSelfReview(t *testing.T) {
	u := uuid.New()
	if _, err := draft(t, u, u, 5, "x"); err == nil {
		t.Fatal("expected self-review rejection")
	}
}

func TestNewDraft_RejectsBadRating(t *testing.T) {
	for _, r := range []int32{0, 6, -1} {
		if _, err := draft(t, uuid.New(), uuid.New(), r, "x"); err == nil {
			t.Fatalf("expected rejection for rating %d", r)
		}
	}
}

func TestNewDraft_RejectsBlankComment(t *testing.T) {
	if _, err := draft(t, uuid.New(), uuid.New(), 3, "   "); err == nil {
		t.Fatal("expected blank comment rejection")
	}
}

func TestSubmit_OnlyFromDraft(t *testing.T) {
	r, _ := draft(t, uuid.New(), uuid.New(), 4, "ok")
	if err := r.SubmitWithSignature(uuid.New(), time.Now()); err != nil {
		t.Fatalf("submit draft: %v", err)
	}
	if r.Status() != ReviewStatusSubmitted || r.SubmittedAt() == nil || r.SignatureID() == nil {
		t.Fatal("submit did not set submitted state")
	}
	if err := r.SubmitWithSignature(uuid.New(), time.Now()); err == nil {
		t.Fatal("expected error: cannot resubmit")
	}
}
