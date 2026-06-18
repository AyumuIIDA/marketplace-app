package app

import (
	"context"

	"github.com/google/uuid"

	listingsapp "marketplace/api-go/internal/modules/listings/application"
	socialapp "marketplace/api-go/internal/modules/social/application"
)

// listingCountsAdapter は listings の ListingCountsReader を social のバッチ集計で満たす
// cross-module アダプタ（composition root に置き、peer import を避ける）。
type listingCountsAdapter struct {
	social socialapp.Repository
}

func newListingCountsAdapter(social socialapp.Repository) *listingCountsAdapter {
	return &listingCountsAdapter{social: social}
}

func (a *listingCountsAdapter) CountsByListingIDs(ctx context.Context, listingIDs []uuid.UUID) (map[uuid.UUID]listingsapp.ListingSocialCounts, error) {
	if len(listingIDs) == 0 {
		return map[uuid.UUID]listingsapp.ListingSocialCounts{}, nil
	}
	likes, err := a.social.CountLikesByListingIDs(ctx, listingIDs)
	if err != nil {
		return nil, err
	}
	comments, err := a.social.CountCommentsByListingIDs(ctx, listingIDs)
	if err != nil {
		return nil, err
	}
	out := make(map[uuid.UUID]listingsapp.ListingSocialCounts, len(listingIDs))
	for _, id := range listingIDs {
		out[id] = listingsapp.ListingSocialCounts{LikeCount: likes[id], CommentCount: comments[id]}
	}
	return out, nil
}

var _ listingsapp.ListingCountsReader = (*listingCountsAdapter)(nil)
