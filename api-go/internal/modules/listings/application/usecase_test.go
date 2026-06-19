package listingsapp

import (
	"context"
	"testing"
	"time"

	"github.com/google/uuid"

	listingsdomain "marketplace/api-go/internal/modules/listings/domain"
	"marketplace/api-go/internal/shared/apperr"
	"marketplace/api-go/internal/shared/clock"
)

// fakeListingRepo は in-memory のListingRepository（テスト用）。
type fakeListingRepo struct {
	byID map[uuid.UUID]*listingsdomain.Listing
}

func newFakeRepo() *fakeListingRepo {
	return &fakeListingRepo{byID: map[uuid.UUID]*listingsdomain.Listing{}}
}

func (f *fakeListingRepo) Save(_ context.Context, l *listingsdomain.Listing) error {
	f.byID[l.ID()] = l
	return nil
}
func (f *fakeListingRepo) SaveImages(_ context.Context, _ listingsdomain.SaveImagesInput) error {
	return nil
}
func (f *fakeListingRepo) FindByID(_ context.Context, id uuid.UUID) (*listingsdomain.Listing, error) {
	return f.byID[id], nil
}
func (f *fakeListingRepo) Search(_ context.Context, _ listingsdomain.SearchInput) ([]*listingsdomain.Listing, error) {
	out := make([]*listingsdomain.Listing, 0, len(f.byID))
	for _, l := range f.byID {
		out = append(out, l)
	}
	return out, nil
}
func (f *fakeListingRepo) ListCategories(_ context.Context) ([]listingsdomain.CategoryCount, error) {
	return nil, nil
}
func (f *fakeListingRepo) ClaimForPurchase(_ context.Context, _ listingsdomain.ClaimForPurchaseInput) (*listingsdomain.Listing, error) {
	return nil, nil
}
func (f *fakeListingRepo) FindByIDs(_ context.Context, _ []uuid.UUID) ([]*listingsdomain.Listing, error) {
	return nil, nil
}

func mkListing(t *testing.T, seller uuid.UUID, publish bool) *listingsdomain.Listing {
	t.Helper()
	l, err := listingsdomain.NewDraft(listingsdomain.CreateDraftInput{
		ID:       uuid.New(),
		SellerID: seller,
		Fields:   listingsdomain.ListingFields{Title: "x", Description: "y", Price: 100, Currency: "JPY", Category: "c", Condition: "good"},
		Now:      time.Now(),
	})
	if err != nil {
		t.Fatal(err)
	}
	if publish {
		sigID := uuid.New()
		_ = l.Publish(&sigID, time.Now())
	}
	return l
}

func TestGetListing_DraftHiddenFromNonOwner(t *testing.T) {
	repo := newFakeRepo()
	seller := uuid.New()
	draft := mkListing(t, seller, false)
	_ = repo.Save(context.Background(), draft)

	uc := NewGetListingUseCase(repo)

	// 非所有者 → Forbidden(403)
	other := uuid.New()
	if _, err := uc.Execute(context.Background(), draft.ID(), &other); err == nil {
		t.Fatal("expected forbidden for non-owner viewing draft")
	} else if ae, ok := apperr.As(err); !ok || ae.Kind != apperr.KindForbidden {
		t.Fatalf("expected Forbidden, got %v", err)
	}

	// 所有者 → 閲覧可
	if _, err := uc.Execute(context.Background(), draft.ID(), &seller); err != nil {
		t.Fatalf("owner should view own draft: %v", err)
	}
}

func TestGetListing_PublishedVisibleToAnyone(t *testing.T) {
	repo := newFakeRepo()
	seller := uuid.New()
	pub := mkListing(t, seller, true)
	_ = repo.Save(context.Background(), pub)

	uc := NewGetListingUseCase(repo)
	other := uuid.New()
	if _, err := uc.Execute(context.Background(), pub.ID(), &other); err != nil {
		t.Fatalf("published listing should be visible to others: %v", err)
	}
}

func TestGetListing_NotFound(t *testing.T) {
	uc := NewGetListingUseCase(newFakeRepo())
	if _, err := uc.Execute(context.Background(), uuid.New(), nil); err == nil {
		t.Fatal("expected not found")
	} else if ae, ok := apperr.As(err); !ok || ae.Kind != apperr.KindNotFound {
		t.Fatalf("expected NotFound, got %v", err)
	}
}

func TestPublishListing_Unsigned(t *testing.T) {
	repo := newFakeRepo()
	seller := uuid.New()
	draft := mkListing(t, seller, false)
	_ = repo.Save(context.Background(), draft)

	uc := NewPublishListingUseCase(repo, clock.NewSystemClock())

	// 非所有者 → Forbidden(403)
	if _, err := uc.Execute(context.Background(), PublishListingInput{ListingID: draft.ID(), SellerID: uuid.New()}); err == nil {
		t.Fatal("expected forbidden for non-owner publish")
	} else if ae, ok := apperr.As(err); !ok || ae.Kind != apperr.KindForbidden {
		t.Fatalf("expected Forbidden, got %v", err)
	}

	// 所有者 → 署名なしで公開（signatureIdは付かない）
	out, err := uc.Execute(context.Background(), PublishListingInput{ListingID: draft.ID(), SellerID: seller})
	if err != nil {
		t.Fatalf("seller should publish own draft: %v", err)
	}
	if out.Status != "PUBLISHED" {
		t.Fatalf("expected PUBLISHED, got %s", out.Status)
	}
	if repo.byID[draft.ID()].SignatureID() != nil {
		t.Fatal("unsigned publish must not set a signatureId")
	}

	// 再公開（DRAFTでない）→ LISTING_NOT_PUBLISHABLE
	if _, err := uc.Execute(context.Background(), PublishListingInput{ListingID: draft.ID(), SellerID: seller}); err == nil {
		t.Fatal("expected error re-publishing a non-draft")
	}
}

func TestSearch_RejectsMinGreaterThanMax(t *testing.T) {
	uc := NewSearchListingsUseCase(newFakeRepo())
	min, max := int32(100), int32(10)
	if _, err := uc.Execute(context.Background(), SearchListingsInput{MinPrice: &min, MaxPrice: &max}); err == nil {
		t.Fatal("expected validation error")
	} else if ae, ok := apperr.As(err); !ok || ae.Kind != apperr.KindValidation {
		t.Fatalf("expected Validation, got %v", err)
	}
}
