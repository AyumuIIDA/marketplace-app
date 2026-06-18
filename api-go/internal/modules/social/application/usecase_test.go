package socialapp_test

import (
	"context"
	"testing"

	"github.com/google/uuid"

	socialapp "marketplace/api-go/internal/modules/social/application"
	socialdomain "marketplace/api-go/internal/modules/social/domain"
	"marketplace/api-go/internal/shared/apperr"
)

// fakeRepo は socialapp.Repository の in-memory 実装（テスト用）。
type fakeRepo struct {
	listingLikes map[[2]uuid.UUID]bool
	sellerLikes  map[[2]uuid.UUID]bool
	profiles     map[uuid.UUID]*socialapp.SellerProfile
	ratings      map[uuid.UUID]socialapp.SellerRating
	comments     map[uuid.UUID][]*socialdomain.Comment
}

func newFakeRepo() *fakeRepo {
	return &fakeRepo{
		listingLikes: map[[2]uuid.UUID]bool{},
		sellerLikes:  map[[2]uuid.UUID]bool{},
		profiles:     map[uuid.UUID]*socialapp.SellerProfile{},
		ratings:      map[uuid.UUID]socialapp.SellerRating{},
		comments:     map[uuid.UUID][]*socialdomain.Comment{},
	}
}

func (f *fakeRepo) LikeListing(_ context.Context, u, l uuid.UUID) error {
	f.listingLikes[[2]uuid.UUID{u, l}] = true
	return nil
}
func (f *fakeRepo) UnlikeListing(_ context.Context, u, l uuid.UUID) error {
	delete(f.listingLikes, [2]uuid.UUID{u, l})
	return nil
}
func (f *fakeRepo) CountListingLikes(_ context.Context, l uuid.UUID) (int64, error) {
	var n int64
	for k := range f.listingLikes {
		if k[1] == l {
			n++
		}
	}
	return n, nil
}
func (f *fakeRepo) IsListingLiked(_ context.Context, u, l uuid.UUID) (bool, error) {
	return f.listingLikes[[2]uuid.UUID{u, l}], nil
}
func (f *fakeRepo) ListLikedListingIDs(_ context.Context, _ uuid.UUID, _, _ int32) ([]uuid.UUID, error) {
	return []uuid.UUID{}, nil
}

func (f *fakeRepo) LikeSeller(_ context.Context, u, s uuid.UUID) error {
	f.sellerLikes[[2]uuid.UUID{u, s}] = true
	return nil
}
func (f *fakeRepo) UnlikeSeller(_ context.Context, u, s uuid.UUID) error {
	delete(f.sellerLikes, [2]uuid.UUID{u, s})
	return nil
}
func (f *fakeRepo) CountSellerLikes(_ context.Context, s uuid.UUID) (int64, error) {
	var n int64
	for k := range f.sellerLikes {
		if k[1] == s {
			n++
		}
	}
	return n, nil
}
func (f *fakeRepo) IsSellerLiked(_ context.Context, u, s uuid.UUID) (bool, error) {
	return f.sellerLikes[[2]uuid.UUID{u, s}], nil
}
func (f *fakeRepo) ListLikedSellerIDs(_ context.Context, u uuid.UUID, _, _ int32) ([]uuid.UUID, error) {
	out := []uuid.UUID{}
	for k := range f.sellerLikes {
		if k[0] == u {
			out = append(out, k[1])
		}
	}
	return out, nil
}
func (f *fakeRepo) FindSellerProfile(_ context.Context, s uuid.UUID) (*socialapp.SellerProfile, error) {
	return f.profiles[s], nil
}
func (f *fakeRepo) GetSellerRating(_ context.Context, s uuid.UUID) (socialapp.SellerRating, error) {
	return f.ratings[s], nil
}
func (f *fakeRepo) SaveComment(_ context.Context, c *socialdomain.Comment) error {
	f.comments[c.ListingID()] = append(f.comments[c.ListingID()], c)
	return nil
}
func (f *fakeRepo) ListComments(_ context.Context, listingID uuid.UUID, _, _ int32) ([]socialapp.CommentRow, error) {
	rows := make([]socialapp.CommentRow, 0, len(f.comments[listingID]))
	for _, c := range f.comments[listingID] {
		rows = append(rows, socialapp.CommentRow{
			CommentID: c.ID(), ListingID: c.ListingID(), AuthorID: c.AuthorID(),
			Body: c.Body(), CreatedAt: c.CreatedAt(), AuthorDisplayName: "tester", AuthorHumanVerified: true,
		})
	}
	return rows, nil
}
func (f *fakeRepo) CountComments(_ context.Context, listingID uuid.UUID) (int64, error) {
	return int64(len(f.comments[listingID])), nil
}
func (f *fakeRepo) CountLikesByListingIDs(_ context.Context, _ []uuid.UUID) (map[uuid.UUID]int64, error) {
	return map[uuid.UUID]int64{}, nil
}
func (f *fakeRepo) CountCommentsByListingIDs(_ context.Context, _ []uuid.UUID) (map[uuid.UUID]int64, error) {
	return map[uuid.UUID]int64{}, nil
}

func TestListingLikeToggle(t *testing.T) {
	repo := newFakeRepo()
	uc := socialapp.NewListingLikeUseCase(repo)
	user, listing := uuid.New(), uuid.New()

	st, err := uc.Like(context.Background(), user, listing)
	if err != nil {
		t.Fatal(err)
	}
	if !st.LikedByMe || st.LikeCount != 1 {
		t.Fatalf("after like: got %+v, want liked=true count=1", st)
	}

	// 冪等: 二重likeでも件数は1。
	if st, _ = uc.Like(context.Background(), user, listing); st.LikeCount != 1 {
		t.Fatalf("double like should stay 1, got %d", st.LikeCount)
	}

	st, err = uc.Unlike(context.Background(), user, listing)
	if err != nil {
		t.Fatal(err)
	}
	if st.LikedByMe || st.LikeCount != 0 {
		t.Fatalf("after unlike: got %+v, want liked=false count=0", st)
	}
}

func TestSellerLikeRejectsSelf(t *testing.T) {
	repo := newFakeRepo()
	uc := socialapp.NewSellerLikeUseCase(repo)
	user := uuid.New()

	_, err := uc.Like(context.Background(), user, user)
	if err == nil {
		t.Fatal("self seller-like should be rejected")
	}
	if ae, ok := apperr.As(err); !ok || ae.Kind != apperr.KindValidation {
		t.Fatalf("want validation error, got %v", err)
	}
}

func TestGetSellerSummary(t *testing.T) {
	repo := newFakeRepo()
	seller, viewer := uuid.New(), uuid.New()

	// 未知の出品者は NotFound。
	uc := socialapp.NewGetSellerSummaryUseCase(repo)
	if _, err := uc.Execute(context.Background(), seller, nil); !apperr.IsNotFound(err) {
		t.Fatalf("unknown seller should be NotFound, got %v", err)
	}

	repo.profiles[seller] = &socialapp.SellerProfile{DisplayName: "Mika", HumanVerified: true}
	avg := 4.5
	repo.ratings[seller] = socialapp.SellerRating{Average: &avg, Count: 2}
	_ = repo.LikeSeller(context.Background(), viewer, seller)

	view, err := uc.Execute(context.Background(), seller, &viewer)
	if err != nil {
		t.Fatal(err)
	}
	if view.DisplayName != "Mika" || !view.HumanVerified {
		t.Fatalf("profile not mapped: %+v", view)
	}
	if view.Rating == nil || *view.Rating != 4.5 || view.ReviewCount != 2 {
		t.Fatalf("rating not mapped: %+v", view)
	}
	if !view.LikedByMe || view.LikeCount != 1 {
		t.Fatalf("like state not mapped: %+v", view)
	}
	if view.Handle == "" {
		t.Fatal("handle should be derived")
	}
}

func TestGetSellerSummaryNoRating(t *testing.T) {
	repo := newFakeRepo()
	seller := uuid.New()
	repo.profiles[seller] = &socialapp.SellerProfile{DisplayName: "New"}
	// rating未設定 = Average nil（評価なし）。

	view, err := socialapp.NewGetSellerSummaryUseCase(repo).Execute(context.Background(), seller, nil)
	if err != nil {
		t.Fatal(err)
	}
	if view.Rating != nil || view.ReviewCount != 0 {
		t.Fatalf("no-rating seller should have nil rating, got %+v", view)
	}
	if view.LikedByMe {
		t.Fatal("nil viewer should not be liked")
	}
}

func TestListLikedSellers(t *testing.T) {
	repo := newFakeRepo()
	user, sellerA, sellerB := uuid.New(), uuid.New(), uuid.New()
	repo.profiles[sellerA] = &socialapp.SellerProfile{DisplayName: "A"}
	// sellerB はプロフィール無し（削除済み相当）→ 結果から除外される。
	_ = repo.LikeSeller(context.Background(), user, sellerA)
	_ = repo.LikeSeller(context.Background(), user, sellerB)

	summary := socialapp.NewGetSellerSummaryUseCase(repo)
	out, err := socialapp.NewListLikedSellersUseCase(repo, summary).Execute(context.Background(), user, 24, 0)
	if err != nil {
		t.Fatal(err)
	}
	if len(out.Items) != 1 || out.Items[0].DisplayName != "A" {
		t.Fatalf("should return only resolvable sellers, got %+v", out.Items)
	}
}
