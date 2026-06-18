package workflows

import (
	"context"
	"testing"

	"github.com/google/uuid"

	listingsapp "marketplace/api-go/internal/modules/listings/application"
)

// confirmed=false の場合、transactionを開かず確認要求のみ返す。
func TestPurchase_RequiresConfirmation(t *testing.T) {
	w := NewPurchaseItemWorkflow(failRunner{t}, listingsapp.NewListingPurchaseService(), nil, nil)
	id := uuid.New()
	res, err := w.Execute(context.Background(), PurchaseItemInput{ListingID: id, BuyerID: uuid.New(), Confirmed: false})
	if err != nil {
		t.Fatalf("Execute: %v", err)
	}
	if res.Status != "REQUIRES_CONFIRMATION" {
		t.Errorf("status = %q, want REQUIRES_CONFIRMATION", res.Status)
	}
	if res.ListingID != id.String() {
		t.Errorf("listingId = %q", res.ListingID)
	}
	if res.Order != nil {
		t.Error("order must be nil when confirmation is required")
	}
}

// failRunner はRunが呼ばれたら失敗させる（確認前にtxを開かないことの保証）。
type failRunner struct{ t *testing.T }

func (f failRunner) Run(_ context.Context, _ func(context.Context, PurchaseRepos) error) error {
	f.t.Fatal("tx runner must not be invoked before confirmation")
	return nil
}
