package listingsapp

import (
	"context"

	"github.com/google/uuid"

	listingsdomain "marketplace/api-go/internal/modules/listings/domain"
)

// ListListingsByIDsUseCase は指定idの出品を入力順で返す（いいねした商品一覧のhydrate用）。
// 跨module参照は関数注入で行うため、本UseCaseのExecuteを他moduleへ渡して合成する
// （recommendation が GetListingUseCase.Execute を注入するのと同じ方式）。
type ListListingsByIDsUseCase struct {
	listings listingsdomain.ListingRepository
}

func NewListListingsByIDsUseCase(r listingsdomain.ListingRepository) *ListListingsByIDsUseCase {
	return &ListListingsByIDsUseCase{listings: r}
}

// Execute は ids 順を保って ListingView を返す。存在しないidは黙って除外する。
func (uc *ListListingsByIDsUseCase) Execute(ctx context.Context, ids []uuid.UUID) ([]ListingView, error) {
	if len(ids) == 0 {
		return []ListingView{}, nil
	}
	found, err := uc.listings.FindByIDs(ctx, ids)
	if err != nil {
		return nil, err
	}
	byID := make(map[uuid.UUID]*listingsdomain.Listing, len(found))
	for _, l := range found {
		byID[l.ID()] = l
	}
	items := make([]ListingView, 0, len(ids))
	for _, id := range ids {
		if l, ok := byID[id]; ok {
			items = append(items, presentListing(l))
		}
	}
	return items, nil
}
