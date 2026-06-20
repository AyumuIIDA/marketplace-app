package workflows

import (
	"context"
	"errors"
	"testing"
	"time"

	"github.com/google/uuid"

	listingsdomain "marketplace/api-go/internal/modules/listings/domain"
	recommendationapp "marketplace/api-go/internal/modules/recommendation/application"
)

// --- fakes ---

type fakeListingRepo struct {
	listing *listingsdomain.Listing
	err     error
}

func (f *fakeListingRepo) FindByID(context.Context, uuid.UUID) (*listingsdomain.Listing, error) {
	return f.listing, f.err
}
func (f *fakeListingRepo) Save(context.Context, *listingsdomain.Listing) error { return nil }
func (f *fakeListingRepo) SaveImages(context.Context, listingsdomain.SaveImagesInput) error {
	return nil
}
func (f *fakeListingRepo) FindByIDs(context.Context, []uuid.UUID) ([]*listingsdomain.Listing, error) {
	return nil, nil
}
func (f *fakeListingRepo) Search(context.Context, listingsdomain.SearchInput) ([]*listingsdomain.Listing, error) {
	return nil, nil
}
func (f *fakeListingRepo) ListCategories(context.Context) ([]listingsdomain.CategoryCount, error) {
	return nil, nil
}
func (f *fakeListingRepo) ClaimForPurchase(context.Context, listingsdomain.ClaimForPurchaseInput) (*listingsdomain.Listing, error) {
	return nil, nil
}

type fakeVectorIndex struct {
	indexed   []recommendationapp.IndexInput
	deleted   []string
	indexErr  error
	deleteErr error
}

func (f *fakeVectorIndex) SearchByText(context.Context, string, int32, recommendationapp.SearchFilter) ([]recommendationapp.SearchHit, error) {
	return nil, nil
}
func (f *fakeVectorIndex) SimilarItems(context.Context, string, int32, recommendationapp.SearchFilter) ([]recommendationapp.SearchHit, error) {
	return nil, nil
}
func (f *fakeVectorIndex) Index(_ context.Context, in recommendationapp.IndexInput) error {
	f.indexed = append(f.indexed, in)
	return f.indexErr
}
func (f *fakeVectorIndex) Delete(_ context.Context, listingID string) error {
	f.deleted = append(f.deleted, listingID)
	return f.deleteErr
}
func (f *fakeVectorIndex) Healthy(context.Context) bool { return true }

// --- helpers ---

func newListing(t *testing.T, publish bool) *listingsdomain.Listing {
	t.Helper()
	l, err := listingsdomain.NewDraft(listingsdomain.CreateDraftInput{
		ID:       uuid.New(),
		SellerID: uuid.New(),
		Fields: listingsdomain.ListingFields{
			Title:       "Vintage camera",
			Description: "Mint condition",
			Price:       12000,
			Currency:    listingsdomain.CurrencyJPY,
			Category:    "electronics",
			Condition:   "like_new",
		},
		Now: time.Now(),
	})
	if err != nil {
		t.Fatalf("NewDraft: %v", err)
	}
	if publish {
		if err := l.Publish(nil, time.Now()); err != nil {
			t.Fatalf("Publish: %v", err)
		}
	}
	return l
}

// --- tests ---

func TestListingIndexer_Reindex_PublishedUpserts(t *testing.T) {
	listing := newListing(t, true)
	repo := &fakeListingRepo{listing: listing}
	vec := &fakeVectorIndex{}
	ix := NewListingIndexer(repo, vec)

	ix.Reindex(context.Background(), uuid.New())

	if len(vec.indexed) != 1 {
		t.Fatalf("expected 1 upsert, got %d", len(vec.indexed))
	}
	got := vec.indexed[0]
	if got.Title != "Vintage camera" || got.Category != "electronics" || got.Status != "PUBLISHED" {
		t.Fatalf("unexpected index input: %+v", got)
	}
	if len(vec.deleted) != 0 {
		t.Fatalf("did not expect deletes, got %v", vec.deleted)
	}
}

func TestListingIndexer_Reindex_DraftRemoves(t *testing.T) {
	listing := newListing(t, false) // DRAFT は検索対象外
	repo := &fakeListingRepo{listing: listing}
	vec := &fakeVectorIndex{}
	ix := NewListingIndexer(repo, vec)

	ix.Reindex(context.Background(), uuid.New())

	if len(vec.indexed) != 0 {
		t.Fatalf("did not expect upsert for draft, got %v", vec.indexed)
	}
	if len(vec.deleted) != 1 {
		t.Fatalf("expected 1 delete for draft, got %d", len(vec.deleted))
	}
}

func TestListingIndexer_Reindex_SwallowsIndexError(t *testing.T) {
	repo := &fakeListingRepo{listing: newListing(t, true)}
	vec := &fakeVectorIndex{indexErr: errors.New("recommendation down")}
	ix := NewListingIndexer(repo, vec)

	// 投影失敗は panic せず正常復帰すること（出品操作を止めない）。
	ix.Reindex(context.Background(), uuid.New())
}

func TestListingIndexer_Reindex_LoadFailureNoop(t *testing.T) {
	repo := &fakeListingRepo{err: errors.New("db down")}
	vec := &fakeVectorIndex{}
	NewListingIndexer(repo, vec).Reindex(context.Background(), uuid.New())

	if len(vec.indexed) != 0 || len(vec.deleted) != 0 {
		t.Fatalf("expected no vector ops on load failure")
	}
}

func TestListingIndexer_Remove(t *testing.T) {
	vec := &fakeVectorIndex{}
	id := uuid.New()
	NewListingIndexer(&fakeListingRepo{}, vec).Remove(context.Background(), id)

	if len(vec.deleted) != 1 || vec.deleted[0] != id.String() {
		t.Fatalf("expected delete of %s, got %v", id, vec.deleted)
	}
}

func TestListingIndexer_NilSafe(t *testing.T) {
	var ix *ListingIndexer
	ix.Reindex(context.Background(), uuid.New()) // nil receiver
	ix.Remove(context.Background(), uuid.New())

	// nil vector でも no-op。
	noVec := NewListingIndexer(&fakeListingRepo{listing: newListing(t, true)}, nil)
	noVec.Reindex(context.Background(), uuid.New())
}
