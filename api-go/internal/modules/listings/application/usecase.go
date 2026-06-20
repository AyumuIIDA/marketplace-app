package listingsapp

import (
	"context"

	"github.com/google/uuid"

	listingsdomain "marketplace/api-go/internal/modules/listings/domain"
	"marketplace/api-go/internal/shared/apperr"
	"marketplace/api-go/internal/shared/clock"
	"marketplace/api-go/internal/shared/ids"
)

// --- CreateListing ---

type CreateListingInput struct {
	SellerID uuid.UUID
	AgentID  *uuid.UUID
	Fields   listingsdomain.ListingFields
	Images   []listingsdomain.ImageToSave
}

type CreateListingResult struct {
	ListingID string `json:"listingId"`
	Status    string `json:"status"`
}

type CreateListingUseCase struct {
	listings listingsdomain.ListingRepository
	ids      ids.Generator
	clock    clock.Clock
}

func NewCreateListingUseCase(r listingsdomain.ListingRepository, g ids.Generator, c clock.Clock) *CreateListingUseCase {
	return &CreateListingUseCase{listings: r, ids: g, clock: c}
}

func (uc *CreateListingUseCase) Execute(ctx context.Context, in CreateListingInput) (CreateListingResult, error) {
	listing, err := listingsdomain.NewDraft(listingsdomain.CreateDraftInput{
		ID:       uc.ids.NewID(),
		SellerID: in.SellerID,
		AgentID:  in.AgentID,
		Fields:   in.Fields,
		Now:      uc.clock.Now(),
	})
	if err != nil {
		return CreateListingResult{}, err
	}
	if err := uc.listings.Save(ctx, listing); err != nil {
		return CreateListingResult{}, err
	}
	if len(in.Images) > 0 {
		if err := uc.listings.SaveImages(ctx, listingsdomain.SaveImagesInput{
			ListingID: listing.ID(),
			Images:    in.Images,
		}); err != nil {
			return CreateListingResult{}, err
		}
	}
	return CreateListingResult{ListingID: listing.ID().String(), Status: string(listing.Status())}, nil
}

// ListingSocialCounts は出品のソーシャル集計（social module 由来）。
type ListingSocialCounts struct {
	LikeCount    int64
	CommentCount int64
}

// ListingCountsReader は出品ごとのいいね/コメント数を返す read port。
// listings は social と peer 分離のため、実装(adapter)は composition root が注入する。
type ListingCountsReader interface {
	CountsByListingIDs(ctx context.Context, listingIDs []uuid.UUID) (map[uuid.UUID]ListingSocialCounts, error)
}

// SellerVerifiedReader は出品者ユーザーの人間認証状態をバッチで返す read port。
// listings は identity と peer 分離のため、実装(adapter)は composition root が注入する。
// Seal の正本はアカウント認証（human_verified_at）であり、これが出品カード/詳細の認証マークを駆動する。
type SellerVerifiedReader interface {
	VerifiedByUserIDs(ctx context.Context, userIDs []uuid.UUID) (map[uuid.UUID]bool, error)
}

// OrderParticipantReader は listing に紐づく注文の当事者(買い手/売り手)かを返す read port。
// listings は orders と peer 分離のため、実装(adapter)は composition root が注入する。
// 売却(SOLD)済み出品を、その取引の買い手が閲覧できるようにするガード緩和に使う。
type OrderParticipantReader interface {
	IsOrderParticipant(ctx context.Context, listingID, userID uuid.UUID) (bool, error)
}

// --- GetListing ---

type GetListingUseCase struct {
	listings         listingsdomain.ListingRepository
	counts           ListingCountsReader
	sellerVerified   SellerVerifiedReader
	orderParticipant OrderParticipantReader
}

func NewGetListingUseCase(r listingsdomain.ListingRepository) *GetListingUseCase {
	return &GetListingUseCase{listings: r}
}

// WithCounts はソーシャル集計の reader を注入する（任意。未注入なら likeCount/commentCount は0）。
func (uc *GetListingUseCase) WithCounts(reader ListingCountsReader) *GetListingUseCase {
	uc.counts = reader
	return uc
}

// WithSellerVerified は出品者認証の reader を注入する（任意。未注入なら sellerVerified は false）。
func (uc *GetListingUseCase) WithSellerVerified(reader SellerVerifiedReader) *GetListingUseCase {
	uc.sellerVerified = reader
	return uc
}

// WithOrderParticipant は注文当事者判定の reader を注入する（任意。未注入なら売り手のみ閲覧可のまま）。
func (uc *GetListingUseCase) WithOrderParticipant(reader OrderParticipantReader) *GetListingUseCase {
	uc.orderParticipant = reader
	return uc
}

// Execute は出品詳細を返す。非公開(下書き/売却済み等)は出品者本人＋取引の当事者(買い手)のみ閲覧可。
func (uc *GetListingUseCase) Execute(ctx context.Context, listingID uuid.UUID, requesterID *uuid.UUID) (ListingView, error) {
	listing, err := uc.listings.FindByID(ctx, listingID)
	if err != nil {
		return ListingView{}, err
	}
	if listing == nil {
		return ListingView{}, apperr.NotFound("Listing", listingID.String())
	}
	if !listingsdomain.IsSearchable(listing) && !uc.canViewRestricted(ctx, listing, requesterID) {
		return ListingView{}, apperr.Forbidden("Only the seller or the buyer can view this listing.")
	}
	items := []ListingView{presentListing(listing)}
	enrichWithCounts(ctx, uc.counts, items)
	enrichWithSellerVerified(ctx, uc.sellerVerified, items)
	return items[0], nil
}

// canViewRestricted は非公開出品(下書き/売却済み等)を閲覧してよいかを判定する。
// 出品者本人は常に可。加えて、その出品の注文当事者(買い手)は売却済みでも閲覧可とする。
func (uc *GetListingUseCase) canViewRestricted(ctx context.Context, listing *listingsdomain.Listing, requesterID *uuid.UUID) bool {
	if requesterID == nil {
		return false
	}
	if listing.SellerID() == *requesterID {
		return true
	}
	if uc.orderParticipant == nil {
		return false
	}
	ok, err := uc.orderParticipant.IsOrderParticipant(ctx, listing.ID(), *requesterID)
	return err == nil && ok
}

// enrichWithCounts は items の likeCount/commentCount を reader でその場更新する。
// reader が nil／取得失敗時は 0 のまま（ソーシャル集計は付加情報のため致命にしない）。
func enrichWithCounts(ctx context.Context, reader ListingCountsReader, items []ListingView) {
	if reader == nil || len(items) == 0 {
		return
	}
	ids := make([]uuid.UUID, 0, len(items))
	for _, it := range items {
		if id, err := uuid.Parse(it.ListingID); err == nil {
			ids = append(ids, id)
		}
	}
	counts, err := reader.CountsByListingIDs(ctx, ids)
	if err != nil {
		return
	}
	for i := range items {
		id, err := uuid.Parse(items[i].ListingID)
		if err != nil {
			continue
		}
		if c, ok := counts[id]; ok {
			items[i].LikeCount = c.LikeCount
			items[i].CommentCount = c.CommentCount
		}
	}
}

// enrichWithSellerVerified は items の sellerVerified を reader でその場更新する。
// reader が nil／取得失敗時は false のまま（認証マークは付加情報のため致命にしない）。
func enrichWithSellerVerified(ctx context.Context, reader SellerVerifiedReader, items []ListingView) {
	if reader == nil || len(items) == 0 {
		return
	}
	ids := make([]uuid.UUID, 0, len(items))
	seen := make(map[uuid.UUID]struct{}, len(items))
	for _, it := range items {
		id, err := uuid.Parse(it.SellerID)
		if err != nil {
			continue
		}
		if _, dup := seen[id]; dup {
			continue
		}
		seen[id] = struct{}{}
		ids = append(ids, id)
	}
	verified, err := reader.VerifiedByUserIDs(ctx, ids)
	if err != nil {
		return
	}
	for i := range items {
		if id, err := uuid.Parse(items[i].SellerID); err == nil {
			items[i].SellerVerified = verified[id]
		}
	}
}

// --- SearchListings ---

type SearchListingsInput struct {
	Keyword                *string
	Category               *string
	Condition              *string
	MinPrice               *int32
	MaxPrice               *int32
	SellerID               *uuid.UUID
	Signed                 *bool
	IncludeDraftsForSeller bool
	Limit                  *int32
	Offset                 *int32
	Sort                   *string
	Seed                   *string
}

type SearchListingsResult struct {
	Items []ListingView `json:"items"`
}

type SearchListingsUseCase struct {
	listings       listingsdomain.ListingRepository
	counts         ListingCountsReader
	sellerVerified SellerVerifiedReader
}

func NewSearchListingsUseCase(r listingsdomain.ListingRepository) *SearchListingsUseCase {
	return &SearchListingsUseCase{listings: r}
}

// WithCounts はソーシャル集計の reader を注入する（任意）。
func (uc *SearchListingsUseCase) WithCounts(reader ListingCountsReader) *SearchListingsUseCase {
	uc.counts = reader
	return uc
}

// WithSellerVerified は出品者認証の reader を注入する（任意。未注入なら sellerVerified は false）。
func (uc *SearchListingsUseCase) WithSellerVerified(reader SellerVerifiedReader) *SearchListingsUseCase {
	uc.sellerVerified = reader
	return uc
}

func (uc *SearchListingsUseCase) Execute(ctx context.Context, in SearchListingsInput) (SearchListingsResult, error) {
	if in.MinPrice != nil && in.MaxPrice != nil && *in.MinPrice > *in.MaxPrice {
		return SearchListingsResult{}, apperr.Validation("minPrice must be less than or equal to maxPrice.",
			apperr.FieldError{Field: "minPrice", Reason: "gt_max"})
	}

	var status *listingsdomain.ListingStatus
	if !in.IncludeDraftsForSeller {
		published := listingsdomain.ListingStatusPublished
		status = &published
	}

	// 並び順は呼び出し側(handler)が検証済みの値を渡す。nil/未知は SQL 側で newest にフォールバック。
	listings, err := uc.listings.Search(ctx, listingsdomain.SearchInput{
		Keyword:   in.Keyword,
		Category:  in.Category,
		Condition: in.Condition,
		MinPrice:  in.MinPrice,
		MaxPrice:  in.MaxPrice,
		Status:    status,
		SellerID:  in.SellerID,
		Signed:    in.Signed,
		Limit:     in.Limit,
		Offset:    in.Offset,
		Sort:      in.Sort,
		Seed:      in.Seed,
	})
	if err != nil {
		return SearchListingsResult{}, err
	}

	items := make([]ListingView, 0, len(listings))
	for _, l := range listings {
		items = append(items, presentListing(l))
	}
	enrichWithCounts(ctx, uc.counts, items)
	enrichWithSellerVerified(ctx, uc.sellerVerified, items)
	return SearchListingsResult{Items: items}, nil
}

// --- ListCategories ---

type CategoryView struct {
	Category string `json:"category"`
	Count    int64  `json:"count"`
}

type ListCategoriesResult struct {
	Items []CategoryView `json:"items"`
}

type ListCategoriesUseCase struct {
	listings listingsdomain.ListingRepository
}

func NewListCategoriesUseCase(r listingsdomain.ListingRepository) *ListCategoriesUseCase {
	return &ListCategoriesUseCase{listings: r}
}

// Execute は公開中の出品のカテゴリ別件数（件数降順）を返す。フロントのカテゴリ選択肢に使う。
func (uc *ListCategoriesUseCase) Execute(ctx context.Context) (ListCategoriesResult, error) {
	cats, err := uc.listings.ListCategories(ctx)
	if err != nil {
		return ListCategoriesResult{}, err
	}
	items := make([]CategoryView, 0, len(cats))
	for _, c := range cats {
		items = append(items, CategoryView{Category: c.Category, Count: c.Count})
	}
	return ListCategoriesResult{Items: items}, nil
}

// --- UpdateDraftListing ---

type UpdateDraftListingInput struct {
	ListingID uuid.UUID
	SellerID  uuid.UUID
	Fields    listingsdomain.ListingFields
}

type UpdateDraftListingUseCase struct {
	listings listingsdomain.ListingRepository
	clock    clock.Clock
}

func NewUpdateDraftListingUseCase(r listingsdomain.ListingRepository, c clock.Clock) *UpdateDraftListingUseCase {
	return &UpdateDraftListingUseCase{listings: r, clock: c}
}

func (uc *UpdateDraftListingUseCase) Execute(ctx context.Context, in UpdateDraftListingInput) (ListingView, error) {
	listing, err := uc.listings.FindByID(ctx, in.ListingID)
	if err != nil {
		return ListingView{}, err
	}
	if listing == nil {
		return ListingView{}, apperr.NotFound("Listing", in.ListingID.String())
	}
	if listing.SellerID() != in.SellerID {
		return ListingView{}, apperr.Forbidden("Only the seller can update this listing.")
	}
	if err := listing.UpdateDraft(in.Fields, uc.clock.Now()); err != nil {
		return ListingView{}, err
	}
	if err := uc.listings.Save(ctx, listing); err != nil {
		return ListingView{}, err
	}
	return presentListing(listing), nil
}

// --- HideListing ---

type HideListingInput struct {
	ListingID uuid.UUID
	SellerID  uuid.UUID
}

type HideListingResult struct {
	ListingID string `json:"listingId"`
	Status    string `json:"status"`
}

type HideListingUseCase struct {
	listings listingsdomain.ListingRepository
	clock    clock.Clock
}

func NewHideListingUseCase(r listingsdomain.ListingRepository, c clock.Clock) *HideListingUseCase {
	return &HideListingUseCase{listings: r, clock: c}
}

func (uc *HideListingUseCase) Execute(ctx context.Context, in HideListingInput) (HideListingResult, error) {
	listing, err := uc.listings.FindByID(ctx, in.ListingID)
	if err != nil {
		return HideListingResult{}, err
	}
	if listing == nil {
		return HideListingResult{}, apperr.NotFound("Listing", in.ListingID.String())
	}
	if listing.SellerID() != in.SellerID {
		return HideListingResult{}, apperr.Forbidden("Only the seller can hide this listing.")
	}
	listing.Hide(uc.clock.Now())
	if err := uc.listings.Save(ctx, listing); err != nil {
		return HideListingResult{}, err
	}
	return HideListingResult{ListingID: listing.ID().String(), Status: string(listing.Status())}, nil
}

// --- RelistListing ---

type RelistListingInput struct {
	ListingID uuid.UUID
	SellerID  uuid.UUID
}

type RelistListingResult struct {
	ListingID string `json:"listingId"`
	Status    string `json:"status"`
}

type RelistListingUseCase struct {
	listings listingsdomain.ListingRepository
	clock    clock.Clock
}

func NewRelistListingUseCase(r listingsdomain.ListingRepository, c clock.Clock) *RelistListingUseCase {
	return &RelistListingUseCase{listings: r, clock: c}
}

// Execute は取り消し済み(HIDDEN)出品を出品者本人が再公開する。
func (uc *RelistListingUseCase) Execute(ctx context.Context, in RelistListingInput) (RelistListingResult, error) {
	listing, err := uc.listings.FindByID(ctx, in.ListingID)
	if err != nil {
		return RelistListingResult{}, err
	}
	if listing == nil {
		return RelistListingResult{}, apperr.NotFound("Listing", in.ListingID.String())
	}
	if listing.SellerID() != in.SellerID {
		return RelistListingResult{}, apperr.Forbidden("Only the seller can relist this listing.")
	}
	if err := listing.Relist(uc.clock.Now()); err != nil {
		return RelistListingResult{}, err
	}
	if err := uc.listings.Save(ctx, listing); err != nil {
		return RelistListingResult{}, err
	}
	return RelistListingResult{ListingID: listing.ID().String(), Status: string(listing.Status())}, nil
}

// --- PublishListing (署名なし) ---

type PublishListingInput struct {
	ListingID uuid.UUID
	SellerID  uuid.UUID
}

type PublishListingResult struct {
	ListingID string `json:"listingId"`
	Status    string `json:"status"`
}

// PublishListingUseCase は World ID署名なしの公開。login のみで出品可能にする経路。
// 署名付き公開は PublishListingWithHumanSignatureWorkflow が担う。
type PublishListingUseCase struct {
	listings listingsdomain.ListingRepository
	clock    clock.Clock
}

func NewPublishListingUseCase(r listingsdomain.ListingRepository, c clock.Clock) *PublishListingUseCase {
	return &PublishListingUseCase{listings: r, clock: c}
}

func (uc *PublishListingUseCase) Execute(ctx context.Context, in PublishListingInput) (PublishListingResult, error) {
	listing, err := uc.listings.FindByID(ctx, in.ListingID)
	if err != nil {
		return PublishListingResult{}, err
	}
	if listing == nil {
		return PublishListingResult{}, apperr.NotFound("Listing", in.ListingID.String())
	}
	if listing.SellerID() != in.SellerID {
		return PublishListingResult{}, apperr.Forbidden("Only the seller can publish this listing.")
	}
	if err := listing.Publish(nil, uc.clock.Now()); err != nil {
		return PublishListingResult{}, err
	}
	if err := uc.listings.Save(ctx, listing); err != nil {
		return PublishListingResult{}, err
	}
	return PublishListingResult{ListingID: listing.ID().String(), Status: string(listing.Status())}, nil
}
