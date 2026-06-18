package aiinfra

import (
	"context"
	"testing"

	aiapp "marketplace/api-go/internal/modules/aiassistance/application"
)

func strptr(s string) *string { return &s }

func TestDeterministic_SuggestListingFields(t *testing.T) {
	a := NewDeterministicAiAssistant()
	hint := "美品スニーカー"
	out, err := a.SuggestListingFields(context.Background(), aiapp.SuggestListingFieldsInput{UserHint: &hint, ImageURLs: []string{"x"}})
	if err != nil {
		t.Fatal(err)
	}
	if out.Title != hint {
		t.Errorf("title = %q, want %q", out.Title, hint)
	}
	if out.Category != "general" || out.Condition != "good" {
		t.Errorf("unexpected category/condition: %q/%q", out.Category, out.Condition)
	}
	if len(out.ConfidenceNotes) == 0 {
		t.Error("expected confidence notes")
	}

	// hintなし → 既定文言
	out2, _ := a.SuggestListingFields(context.Background(), aiapp.SuggestListingFieldsInput{ImageURLs: []string{"x"}})
	if out2.Title != "中古品" {
		t.Errorf("default title = %q", out2.Title)
	}
}

func TestDeterministic_SuggestPrice_ConditionAndStrategy(t *testing.T) {
	a := NewDeterministicAiAssistant()
	// electronics base 15000, new factor 1.2, premium 1.1 → round to 100s
	out, _ := a.SuggestPrice(context.Background(), aiapp.SuggestPriceInput{
		Title: "t", Category: "electronics", Condition: "new", PriceStrategy: strptr("premium"),
	})
	if out.Currency != "JPY" || out.SuggestedPrice <= 0 {
		t.Errorf("unexpected price: %+v", out)
	}
	if out.SuggestedPrice%100 != 0 {
		t.Errorf("price not rounded to 100s: %d", out.SuggestedPrice)
	}
}

func TestDeterministic_CompareListings_PicksCheapest(t *testing.T) {
	a := NewDeterministicAiAssistant()
	out, _ := a.CompareListings(context.Background(), aiapp.CompareListingsInput{Listings: []aiapp.ComparableListing{
		{ListingID: "a", Title: "A", Price: 5000, Currency: "JPY", Condition: "good"},
		{ListingID: "b", Title: "B", Price: 3000, Currency: "JPY", Condition: "fair"},
	}})
	if len(out.Items) != 2 {
		t.Fatalf("items = %d", len(out.Items))
	}
	for _, it := range out.Items {
		if it.ListingID == "b" && len(it.Cons) != 0 {
			t.Error("cheapest should have no cons")
		}
		if it.ListingID == "a" && len(it.Cons) == 0 {
			t.Error("non-cheapest should have cons")
		}
	}
}
