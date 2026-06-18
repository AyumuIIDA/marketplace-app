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

// --- GetListing ---

type GetListingUseCase struct {
	listings listingsdomain.ListingRepository
	counts   ListingCountsReader
}

func NewGetListingUseCase(r listingsdomain.ListingRepository) *GetListingUseCase {
	return &GetListingUseCase{listings: r}
}

// WithCounts はソーシャル集計の reader を注入する（任意。未注入なら likeCount/commentCount は0）。
func (uc *GetListingUseCase) WithCounts(reader ListingCountsReader) *GetListingUseCase {
	uc.counts = reader
	return uc
}

// Execute は出品詳細を返す。非公開(下書き等)は出品者本人のみ閲覧可。
func (uc *GetListingUseCase) Execute(ctx context.Context, listingID uuid.UUID, requesterID *uuid.UUID) (ListingView, error) {
	listing, err := uc.listings.FindByID(ctx, listingID)
	if err != nil {
		return ListingView{}, err
	}
	if listing == nil {
		return ListingView{}, apperr.NotFound("Listing", listingID.String())
	}
	if !listingsdomain.IsSearchable(listing) {
		if requesterID == nil || listing.SellerID() != *requesterID {
			return ListingView{}, apperr.Forbidden("Only the seller can view this listing.")
		}
	}
	items := []ListingView{presentListing(listing)}
	enrichWithCounts(ctx, uc.counts, items)
	return items[0], nil
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

// --- SearchListings ---

type SearchListingsInput struct {
	Keyword                *string
	Category               *string
	Condition              *string
	MinPrice               *int32
	MaxPrice               *int32
	SellerID               *uuid.UUID
	IncludeDraftsForSeller bool
	Limit                  *int32
	Offset                 *int32
}

type SearchListingsResult struct {
	Items []ListingView `json:"items"`
}

type SearchListingsUseCase struct {
	listings listingsdomain.ListingRepository
	counts   ListingCountsReader
}

func NewSearchListingsUseCase(r listingsdomain.ListingRepository) *SearchListingsUseCase {
	return &SearchListingsUseCase{listings: r}
}

// WithCounts はソーシャル集計の reader を注入する（任意）。
func (uc *SearchListingsUseCase) WithCounts(reader ListingCountsReader) *SearchListingsUseCase {
	uc.counts = reader
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

	// 無フィルタの一覧（ホームの注目フィード）は全カテゴリを混ぜて返す。
	// keyword/category/seller のいずれかが指定された絞り込み/ページネーション時は新着順で安定させる。
	randomize := in.Keyword == nil && in.Category == nil && in.SellerID == nil

	listings, err := uc.listings.Search(ctx, listingsdomain.SearchInput{
		Keyword:   in.Keyword,
		Category:  in.Category,
		Condition: in.Condition,
		MinPrice:  in.MinPrice,
		MaxPrice:  in.MaxPrice,
		Status:    status,
		SellerID:  in.SellerID,
		Limit:     in.Limit,
		Offset:    in.Offset,
		Randomize: randomize,
	})
	if err != nil {
		return SearchListingsResult{}, err
	}

	items := make([]ListingView, 0, len(listings))
	for _, l := range listings {
		items = append(items, presentListing(l))
	}
	enrichWithCounts(ctx, uc.counts, items)
	return SearchListingsResult{Items: items}, nil
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
