package workflows

import (
	"context"
	"testing"
	"time"

	"github.com/google/uuid"

	listingsapp "marketplace/api-go/internal/modules/listings/application"
	listingsdomain "marketplace/api-go/internal/modules/listings/domain"
	signaturesapp "marketplace/api-go/internal/modules/signatures/application"
	signaturesdomain "marketplace/api-go/internal/modules/signatures/domain"
	"marketplace/api-go/internal/shared/ids"
)

type fixedClock struct{ t time.Time }

func (c fixedClock) Now() time.Time { return c.t }

// --- in-memory repos ---

type memListingRepo struct{ l *listingsdomain.Listing }

func (m *memListingRepo) Save(_ context.Context, l *listingsdomain.Listing) error {
	m.l = l
	return nil
}
func (m *memListingRepo) SaveImages(context.Context, listingsdomain.SaveImagesInput) error {
	return nil
}
func (m *memListingRepo) FindByID(_ context.Context, _ uuid.UUID) (*listingsdomain.Listing, error) {
	return m.l, nil
}
func (m *memListingRepo) FindByIDs(_ context.Context, _ []uuid.UUID) ([]*listingsdomain.Listing, error) {
	return nil, nil
}
func (m *memListingRepo) Search(context.Context, listingsdomain.SearchInput) ([]*listingsdomain.Listing, error) {
	return nil, nil
}
func (m *memListingRepo) ListCategories(context.Context) ([]listingsdomain.CategoryCount, error) {
	return nil, nil
}
func (m *memListingRepo) ClaimForPurchase(context.Context, listingsdomain.ClaimForPurchaseInput) (*listingsdomain.Listing, error) {
	return nil, nil
}

type memSigRepo struct {
	saved []*signaturesdomain.HumanSignature
}

func (m *memSigRepo) Save(_ context.Context, s *signaturesdomain.HumanSignature) error {
	m.saved = append(m.saved, s)
	return nil
}
func (m *memSigRepo) FindValidByResourcePayload(context.Context, signaturesdomain.FindValidInput) (*signaturesdomain.HumanSignature, error) {
	return nil, nil
}

type memWorldRepo struct{ saved int }

func (m *memWorldRepo) Save(context.Context, *signaturesdomain.WorldIdVerification) error {
	m.saved++
	return nil
}
func (m *memWorldRepo) CountByUserAction(context.Context, uuid.UUID, string) (int64, error) {
	return int64(m.saved), nil
}

type memTxRunner struct{ repos HumanSignatureRepos }

func (r memTxRunner) Run(ctx context.Context, fn func(context.Context, HumanSignatureRepos) error) error {
	return fn(ctx, r.repos)
}

// --- fakes for signatures ports ---

type fakeVerifier struct{ out signaturesapp.VerifiedWorldID }

func (f fakeVerifier) Verify(context.Context, signaturesapp.IdKitResult) (signaturesapp.VerifiedWorldID, error) {
	return f.out, nil
}

type fakeSigner struct{}

func (fakeSigner) Sign(_ context.Context, in signaturesapp.SignInput) (signaturesapp.SignOutput, error) {
	return signaturesapp.SignOutput{SignatureValue: "header.payload.sig", SignedAt: in.IssuedAt}, nil
}

func TestPublishWorkflow_HappyPath(t *testing.T) {
	seller := uuid.New()
	draft, err := listingsdomain.NewDraft(listingsdomain.CreateDraftInput{
		ID:       uuid.New(),
		SellerID: seller,
		Fields:   listingsdomain.ListingFields{Title: "x", Description: "y", Price: 1000, Currency: "JPY", Category: "c", Condition: "good"},
		Now:      time.Now(),
	})
	if err != nil {
		t.Fatal(err)
	}

	// signal_hash は payload hash と一致しないと束縛検証で弾かれる。
	payloadHash, err := listingsapp.ComputeListingPayloadHash(listingsapp.ListingToSignaturePayload(draft))
	if err != nil {
		t.Fatal(err)
	}

	listingRepo := &memListingRepo{l: draft}
	sigRepo := &memSigRepo{}
	worldRepo := &memWorldRepo{}
	tx := memTxRunner{repos: HumanSignatureRepos{Listings: listingRepo, HumanSignatures: sigRepo, WorldIDVerifications: worldRepo}}

	clk := fixedClock{t: time.Now()}
	svc := signaturesapp.NewHumanSignatureService(
		fakeVerifier{out: signaturesapp.VerifiedWorldID{
			Action: "listing-publish", NullifierHash: "nullhash", VerificationLevel: "orb",
			SignalHash: &payloadHash, Environment: "staging", VerifiedAt: clk.t,
		}},
		signaturesapp.NewHumanSignatureCreator(fakeSigner{}, ids.NewUUIDGenerator(), clk),
	)

	wf := NewPublishListingWithHumanSignatureWorkflow(tx, listingsapp.NewListingPublicationService(), svc)
	out, err := wf.Execute(context.Background(), PublishListingInput{
		ListingID: draft.ID(),
		SellerID:  seller,
	})
	if err != nil {
		t.Fatalf("Execute: %v", err)
	}
	if out.Status != "PUBLISHED" {
		t.Errorf("status = %q, want PUBLISHED", out.Status)
	}
	if len(sigRepo.saved) != 1 {
		t.Errorf("expected 1 saved signature, got %d", len(sigRepo.saved))
	}
	if worldRepo.saved != 1 {
		t.Errorf("expected 1 world id verification, got %d", worldRepo.saved)
	}
	if listingRepo.l.Status() != listingsdomain.ListingStatusPublished {
		t.Errorf("listing status = %q, want PUBLISHED", listingRepo.l.Status())
	}
	if listingRepo.l.SignatureID() == nil {
		t.Error("listing signatureId not set")
	}
}

func TestPublishWorkflow_ActionMismatchRejected(t *testing.T) {
	seller := uuid.New()
	draft, _ := listingsdomain.NewDraft(listingsdomain.CreateDraftInput{
		ID: uuid.New(), SellerID: seller,
		Fields: listingsdomain.ListingFields{Title: "x", Description: "y", Price: 1000, Currency: "JPY", Category: "c", Condition: "good"},
		Now:    time.Now(),
	})
	tx := memTxRunner{repos: HumanSignatureRepos{Listings: &memListingRepo{l: draft}, HumanSignatures: &memSigRepo{}, WorldIDVerifications: &memWorldRepo{}}}
	clk := fixedClock{t: time.Now()}
	// action が review-submit で来る → listing-publish 期待と不一致で Phase1 で弾く。
	svc := signaturesapp.NewHumanSignatureService(
		fakeVerifier{out: signaturesapp.VerifiedWorldID{Action: "review-submit", NullifierHash: "n", VerificationLevel: "orb", Environment: "staging", VerifiedAt: clk.t}},
		signaturesapp.NewHumanSignatureCreator(fakeSigner{}, ids.NewUUIDGenerator(), clk),
	)
	wf := NewPublishListingWithHumanSignatureWorkflow(tx, listingsapp.NewListingPublicationService(), svc)
	if _, err := wf.Execute(context.Background(), PublishListingInput{ListingID: draft.ID(), SellerID: seller}); err == nil {
		t.Fatal("expected action mismatch error")
	}
}
