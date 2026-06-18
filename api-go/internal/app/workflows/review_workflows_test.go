package workflows

import (
	"context"
	"testing"
	"time"

	"github.com/google/uuid"

	ordersapp "github.com/outarc/marketplace/api-go/internal/modules/orders/application"
	ordersdomain "github.com/outarc/marketplace/api-go/internal/modules/orders/domain"
	reviewsapp "github.com/outarc/marketplace/api-go/internal/modules/reviews/application"
	reviewsdomain "github.com/outarc/marketplace/api-go/internal/modules/reviews/domain"
	signaturesapp "github.com/outarc/marketplace/api-go/internal/modules/signatures/application"
	"github.com/outarc/marketplace/api-go/internal/shared/ids"
)

type memOrderRepo struct{ o *ordersdomain.Order }

func (m *memOrderRepo) Save(_ context.Context, o *ordersdomain.Order) error { m.o = o; return nil }
func (m *memOrderRepo) FindByID(_ context.Context, _ uuid.UUID) (*ordersdomain.Order, error) {
	return m.o, nil
}
func (m *memOrderRepo) FindByListingID(_ context.Context, _ uuid.UUID) (*ordersdomain.Order, error) {
	return nil, nil
}
func (m *memOrderRepo) Search(context.Context, ordersdomain.SearchInput) ([]*ordersdomain.Order, error) {
	return nil, nil
}

type memReviewRepo struct {
	byID map[uuid.UUID]*reviewsdomain.Review
}

func (m *memReviewRepo) Save(_ context.Context, r *reviewsdomain.Review) error {
	m.byID[r.ID()] = r
	return nil
}
func (m *memReviewRepo) FindByID(_ context.Context, id uuid.UUID) (*reviewsdomain.Review, error) {
	return m.byID[id], nil
}
func (m *memReviewRepo) FindSubmittedByOrderReviewer(context.Context, uuid.UUID, uuid.UUID) (*reviewsdomain.Review, error) {
	return nil, nil
}
func (m *memReviewRepo) Search(_ context.Context, in reviewsdomain.SearchInput) ([]*reviewsdomain.Review, error) {
	var out []*reviewsdomain.Review
	for _, r := range m.byID {
		if in.Status != nil && r.Status() != *in.Status {
			continue
		}
		out = append(out, r)
	}
	return out, nil
}

type reviewTxFake struct{ repos ReviewRepos }

func (f reviewTxFake) Run(ctx context.Context, fn func(context.Context, ReviewRepos) error) error {
	return fn(ctx, f.repos)
}

func TestSubmitReview_CompletesOrderWhenBothReviewed(t *testing.T) {
	buyer, seller := uuid.New(), uuid.New()
	orderID := uuid.New()
	now := time.Now()

	order := ordersdomain.Rehydrate(ordersdomain.RehydrateInput{
		ID: orderID, ListingID: uuid.New(), BuyerID: buyer, SellerID: seller,
		Status: ordersdomain.OrderStatusReceived, Price: 1000, Currency: "JPY", CreatedAt: now,
	})

	// 売り手は既に提出済み。買い手の下書きをこれから提出する。
	sellerReview, _ := reviewsdomain.NewDraft(reviewsdomain.CreateDraftReviewInput{
		ID: uuid.New(), OrderID: orderID, ReviewerID: seller, RevieweeID: buyer, Rating: 5, Comment: "good buyer", Now: now,
	})
	_ = sellerReview.SubmitWithSignature(uuid.New(), now)
	buyerReview, _ := reviewsdomain.NewDraft(reviewsdomain.CreateDraftReviewInput{
		ID: uuid.New(), OrderID: orderID, ReviewerID: buyer, RevieweeID: seller, Rating: 4, Comment: "good seller", Now: now,
	})

	reviewRepo := &memReviewRepo{byID: map[uuid.UUID]*reviewsdomain.Review{
		sellerReview.ID(): sellerReview, buyerReview.ID(): buyerReview,
	}}
	orderRepo := &memOrderRepo{o: order}
	tx := reviewTxFake{repos: ReviewRepos{Orders: orderRepo, Reviews: reviewRepo, HumanSignatures: &memSigRepo{}, WorldIDVerifications: &memWorldRepo{}}}

	payloadHash, _ := reviewsapp.ComputeReviewPayloadHash(reviewsapp.ReviewToSignaturePayload(buyerReview))
	clk := fixedClock{t: now}
	svc := signaturesapp.NewHumanSignatureService(
		fakeVerifier{out: signaturesapp.VerifiedWorldID{Action: "REVIEW_SUBMIT", NullifierHash: "n", VerificationLevel: "orb", SignalHash: &payloadHash, Environment: "staging", VerifiedAt: now}},
		signaturesapp.NewHumanSignatureCreator(fakeSigner{}, ids.NewUUIDGenerator(), clk),
	)
	of := ordersapp.NewOrderFulfillmentService(ids.NewUUIDGenerator(), clk)

	wf := NewSubmitReviewWithHumanSignatureWorkflow(tx, reviewsapp.NewReviewSubmissionService(), svc, of, clk)
	out, err := wf.Execute(context.Background(), SubmitReviewInput{ReviewID: buyerReview.ID(), ReviewerID: buyer})
	if err != nil {
		t.Fatalf("Execute: %v", err)
	}
	if out.Review.Status != "SUBMITTED" {
		t.Errorf("review status = %q, want SUBMITTED", out.Review.Status)
	}
	if !out.OrderCompleted {
		t.Error("expected order to be completed when both parties reviewed")
	}
	if orderRepo.o.Status() != ordersdomain.OrderStatusCompleted {
		t.Errorf("order status = %q, want COMPLETED", orderRepo.o.Status())
	}
}
