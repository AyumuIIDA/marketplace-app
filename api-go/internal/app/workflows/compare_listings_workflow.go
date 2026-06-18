package workflows

import (
	"context"

	"github.com/google/uuid"
	"golang.org/x/sync/errgroup"

	aiapp "github.com/outarc/marketplace/api-go/internal/modules/aiassistance/application"
	listingsapp "github.com/outarc/marketplace/api-go/internal/modules/listings/application"
)

// CompareListingsWorkflow は対象出品を並列取得し、AIで比較する（listings + ai-assistance）。
// GetListingで閲覧権限をゲート（下書きは出品者のみ）し、独立I/Oをfan-out取得する（§16）。
type CompareListingsWorkflow struct {
	getListing *listingsapp.GetListingUseCase
	assistant  aiapp.AiAssistant
}

func NewCompareListingsWorkflow(getListing *listingsapp.GetListingUseCase, assistant aiapp.AiAssistant) *CompareListingsWorkflow {
	return &CompareListingsWorkflow{getListing: getListing, assistant: assistant}
}

func (w *CompareListingsWorkflow) Execute(ctx context.Context, listingIDs []uuid.UUID, requesterID uuid.UUID) (aiapp.CompareListingsResult, error) {
	views := make([]listingsapp.ListingView, len(listingIDs))
	g, gctx := errgroup.WithContext(ctx)
	g.SetLimit(8)
	rid := requesterID
	for i, id := range listingIDs {
		i, id := i, id
		g.Go(func() error {
			v, err := w.getListing.Execute(gctx, id, &rid)
			if err != nil {
				return err
			}
			views[i] = v
			return nil
		})
	}
	if err := g.Wait(); err != nil {
		return aiapp.CompareListingsResult{}, err
	}

	comparables := make([]aiapp.ComparableListing, 0, len(views))
	for _, v := range views {
		comparables = append(comparables, aiapp.ComparableListing{
			ListingID:   v.ListingID,
			Title:       v.Title,
			Description: v.Description,
			Price:       v.Price,
			Currency:    v.Currency,
			Condition:   v.Condition,
			Category:    v.Category,
		})
	}
	return w.assistant.CompareListings(ctx, aiapp.CompareListingsInput{Listings: comparables})
}
