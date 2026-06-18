package listingsapp

import (
	"context"

	"github.com/google/uuid"

	listingsdomain "github.com/outarc/marketplace/api-go/internal/modules/listings/domain"
	"github.com/outarc/marketplace/api-go/internal/shared/apperr"
	"github.com/outarc/marketplace/api-go/internal/shared/clock"
	"github.com/outarc/marketplace/api-go/internal/shared/ids"
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

// --- GetListing ---

type GetListingUseCase struct {
	listings listingsdomain.ListingRepository
}

func NewGetListingUseCase(r listingsdomain.ListingRepository) *GetListingUseCase {
	return &GetListingUseCase{listings: r}
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
	return presentListing(listing), nil
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
}

type SearchListingsResult struct {
	Items []ListingView `json:"items"`
}

type SearchListingsUseCase struct {
	listings listingsdomain.ListingRepository
}

func NewSearchListingsUseCase(r listingsdomain.ListingRepository) *SearchListingsUseCase {
	return &SearchListingsUseCase{listings: r}
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

	listings, err := uc.listings.Search(ctx, listingsdomain.SearchInput{
		Keyword:   in.Keyword,
		Category:  in.Category,
		Condition: in.Condition,
		MinPrice:  in.MinPrice,
		MaxPrice:  in.MaxPrice,
		Status:    status,
		SellerID:  in.SellerID,
		Limit:     in.Limit,
	})
	if err != nil {
		return SearchListingsResult{}, err
	}

	items := make([]ListingView, 0, len(listings))
	for _, l := range listings {
		items = append(items, presentListing(l))
	}
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
