package workflows

import (
	"context"
	"testing"

	"github.com/google/uuid"

	listingsapp "marketplace/api-go/internal/modules/listings/application"
	recommendationapp "marketplace/api-go/internal/modules/recommendation/application"
	"marketplace/api-go/internal/shared/apperr"
)

type fakeIndex struct {
	hits []recommendationapp.SearchHit
	err  error
}

func (f fakeIndex) SearchByText(context.Context, string, int32, recommendationapp.SearchFilter) ([]recommendationapp.SearchHit, error) {
	return f.hits, f.err
}
func (f fakeIndex) SimilarItems(context.Context, string, int32, recommendationapp.SearchFilter) ([]recommendationapp.SearchHit, error) {
	return f.hits, f.err
}
func (fakeIndex) Index(context.Context, recommendationapp.IndexInput) error { return nil }
func (fakeIndex) Delete(context.Context, string) error                      { return nil }

func TestSemanticSearchHydratesAndPreservesOrderAndScore(t *testing.T) {
	id1, id2, missing := uuid.New(), uuid.New(), uuid.New()
	index := fakeIndex{hits: []recommendationapp.SearchHit{
		{ListingID: id1.String(), Score: 0.9},
		{ListingID: missing.String(), Score: 0.8}, // hydrate失敗→除外
		{ListingID: id2.String(), Score: 0.7},
		{ListingID: "not-a-uuid", Score: 0.6}, // 非UUID→除外
	}}
	lookup := func(_ context.Context, id uuid.UUID, _ *uuid.UUID) (listingsapp.ListingView, error) {
		switch id {
		case id1:
			return listingsapp.ListingView{ListingID: id1.String(), Title: "first"}, nil
		case id2:
			return listingsapp.ListingView{ListingID: id2.String(), Title: "second"}, nil
		default:
			return listingsapp.ListingView{}, apperr.NotFound("Listing", id.String())
		}
	}

	w := NewSemanticSearchWorkflow(index, lookup)
	res, err := w.Execute(context.Background(), "黒い革のケース", recommendationapp.SearchFilter{}, 10, nil)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(res.Items) != 2 {
		t.Fatalf("want 2 hydrated items, got %d", len(res.Items))
	}
	if res.Items[0].ListingID != id1.String() || res.Items[0].Score != 0.9 {
		t.Errorf("first item mismatch: %+v", res.Items[0])
	}
	if res.Items[1].ListingID != id2.String() || res.Items[1].Score != 0.7 {
		t.Errorf("second item mismatch: %+v", res.Items[1])
	}
}

func TestSemanticSearchPropagatesIndexError(t *testing.T) {
	index := fakeIndex{err: apperr.Infrastructure("boom", nil)}
	w := NewSemanticSearchWorkflow(index, func(context.Context, uuid.UUID, *uuid.UUID) (listingsapp.ListingView, error) {
		return listingsapp.ListingView{}, nil
	})
	if _, err := w.Execute(context.Background(), "q", recommendationapp.SearchFilter{}, 10, nil); err == nil {
		t.Fatal("expected error to propagate")
	}
}
