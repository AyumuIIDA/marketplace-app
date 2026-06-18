package listingsdomain

import (
	"testing"
	"time"

	"github.com/google/uuid"
)

func validFields() ListingFields {
	return ListingFields{Title: "Chair", Description: "nice", Price: 5000, Currency: "JPY", Category: "furniture", Condition: "good"}
}

func newDraft(t *testing.T) *Listing {
	t.Helper()
	l, err := NewDraft(CreateDraftInput{ID: uuid.New(), SellerID: uuid.New(), Fields: validFields(), Now: time.Now()})
	if err != nil {
		t.Fatalf("NewDraft: %v", err)
	}
	return l
}

func TestNewDraft_DefaultsCurrencyAndValidates(t *testing.T) {
	f := validFields()
	f.Currency = ""
	l, err := NewDraft(CreateDraftInput{ID: uuid.New(), SellerID: uuid.New(), Fields: f, Now: time.Now()})
	if err != nil {
		t.Fatalf("NewDraft: %v", err)
	}
	if l.Fields().Currency != CurrencyJPY {
		t.Errorf("currency = %q, want JPY", l.Fields().Currency)
	}
	if l.Status() != ListingStatusDraft {
		t.Errorf("status = %q, want DRAFT", l.Status())
	}
}

func TestNewDraft_RejectsNonPositivePrice(t *testing.T) {
	f := validFields()
	f.Price = 0
	if _, err := NewDraft(CreateDraftInput{ID: uuid.New(), SellerID: uuid.New(), Fields: f, Now: time.Now()}); err == nil {
		t.Fatal("expected error for non-positive price")
	}
}

func TestPublish_OnlyFromDraft(t *testing.T) {
	l := newDraft(t)
	if err := l.Publish(uuid.New(), time.Now()); err != nil {
		t.Fatalf("Publish: %v", err)
	}
	if l.Status() != ListingStatusPublished || l.PublishedAt() == nil || l.SignatureID() == nil {
		t.Fatal("publish did not set published state")
	}
	// 二重publishは不可
	if err := l.Publish(uuid.New(), time.Now()); err == nil {
		t.Fatal("expected error publishing a non-draft")
	}
}

func TestMarkSold_OnlyFromPublished(t *testing.T) {
	l := newDraft(t)
	if err := l.MarkSold(time.Now()); err == nil {
		t.Fatal("expected error: cannot sell a draft")
	}
	_ = l.Publish(uuid.New(), time.Now())
	if err := l.MarkSold(time.Now()); err != nil {
		t.Fatalf("MarkSold: %v", err)
	}
	if l.Status() != ListingStatusSold || l.SoldAt() == nil {
		t.Fatal("markSold did not set sold state")
	}
}

func TestUpdateDraft_OnlyWhenDraft(t *testing.T) {
	l := newDraft(t)
	_ = l.Publish(uuid.New(), time.Now())
	if err := l.UpdateDraft(validFields(), time.Now()); err == nil {
		t.Fatal("expected error: cannot draft-update a published listing")
	}
}
