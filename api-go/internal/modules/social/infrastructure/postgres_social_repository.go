// Package socialinfra は social（いいね/出品者サマリ）のrepositoryをsqlc/pgxで実装する。
package socialinfra

import (
	"context"
	"errors"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"

	"marketplace/api-go/internal/db/pgerr"
	"marketplace/api-go/internal/db/sqlc"
	socialapp "marketplace/api-go/internal/modules/social/application"
)

// PostgresSocialRepository は social.Repository のpostgres実装。
// constructorで受けたDBTX（pool or tx）で実行するだけで、tx境界は持たない。
type PostgresSocialRepository struct {
	q *sqlc.Queries
}

func NewPostgresSocialRepository(db sqlc.DBTX) *PostgresSocialRepository {
	return &PostgresSocialRepository{q: sqlc.New(db)}
}

func (r *PostgresSocialRepository) LikeListing(ctx context.Context, userID, listingID uuid.UUID) error {
	if err := r.q.LikeListing(ctx, sqlc.LikeListingParams{UserID: userID, ListingID: listingID}); err != nil {
		return pgerr.FromPg(err)
	}
	return nil
}

func (r *PostgresSocialRepository) UnlikeListing(ctx context.Context, userID, listingID uuid.UUID) error {
	if err := r.q.UnlikeListing(ctx, sqlc.UnlikeListingParams{UserID: userID, ListingID: listingID}); err != nil {
		return pgerr.FromPg(err)
	}
	return nil
}

func (r *PostgresSocialRepository) CountListingLikes(ctx context.Context, listingID uuid.UUID) (int64, error) {
	count, err := r.q.CountListingLikes(ctx, listingID)
	if err != nil {
		return 0, pgerr.FromPg(err)
	}
	return count, nil
}

func (r *PostgresSocialRepository) IsListingLiked(ctx context.Context, userID, listingID uuid.UUID) (bool, error) {
	liked, err := r.q.IsListingLiked(ctx, sqlc.IsListingLikedParams{UserID: userID, ListingID: listingID})
	if err != nil {
		return false, pgerr.FromPg(err)
	}
	return liked, nil
}

func (r *PostgresSocialRepository) ListLikedListingIDs(ctx context.Context, userID uuid.UUID, limit, offset int32) ([]uuid.UUID, error) {
	ids, err := r.q.ListLikedListingIDs(ctx, sqlc.ListLikedListingIDsParams{UserID: userID, ResultLimit: limit, ResultOffset: offset})
	if err != nil {
		return nil, pgerr.FromPg(err)
	}
	return ids, nil
}

func (r *PostgresSocialRepository) LikeSeller(ctx context.Context, userID, sellerID uuid.UUID) error {
	if err := r.q.LikeSeller(ctx, sqlc.LikeSellerParams{UserID: userID, SellerID: sellerID}); err != nil {
		return pgerr.FromPg(err)
	}
	return nil
}

func (r *PostgresSocialRepository) UnlikeSeller(ctx context.Context, userID, sellerID uuid.UUID) error {
	if err := r.q.UnlikeSeller(ctx, sqlc.UnlikeSellerParams{UserID: userID, SellerID: sellerID}); err != nil {
		return pgerr.FromPg(err)
	}
	return nil
}

func (r *PostgresSocialRepository) CountSellerLikes(ctx context.Context, sellerID uuid.UUID) (int64, error) {
	count, err := r.q.CountSellerLikes(ctx, sellerID)
	if err != nil {
		return 0, pgerr.FromPg(err)
	}
	return count, nil
}

func (r *PostgresSocialRepository) IsSellerLiked(ctx context.Context, userID, sellerID uuid.UUID) (bool, error) {
	liked, err := r.q.IsSellerLiked(ctx, sqlc.IsSellerLikedParams{UserID: userID, SellerID: sellerID})
	if err != nil {
		return false, pgerr.FromPg(err)
	}
	return liked, nil
}

func (r *PostgresSocialRepository) ListLikedSellerIDs(ctx context.Context, userID uuid.UUID, limit, offset int32) ([]uuid.UUID, error) {
	ids, err := r.q.ListLikedSellerIDs(ctx, sqlc.ListLikedSellerIDsParams{UserID: userID, ResultLimit: limit, ResultOffset: offset})
	if err != nil {
		return nil, pgerr.FromPg(err)
	}
	return ids, nil
}

func (r *PostgresSocialRepository) FindSellerProfile(ctx context.Context, sellerID uuid.UUID) (*socialapp.SellerProfile, error) {
	row, err := r.q.GetSellerProfile(ctx, sellerID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil
		}
		return nil, pgerr.FromPg(err)
	}
	return &socialapp.SellerProfile{
		DisplayName:   row.DisplayName,
		AvatarURL:     row.AvatarUrl,
		HumanVerified: row.HumanVerified,
	}, nil
}

func (r *PostgresSocialRepository) GetSellerRating(ctx context.Context, sellerID uuid.UUID) (socialapp.SellerRating, error) {
	row, err := r.q.GetSellerRating(ctx, sellerID)
	if err != nil {
		return socialapp.SellerRating{}, pgerr.FromPg(err)
	}
	// レビュー0件は Average=nil（COALESCEで0が入るが review_count で判定する）。
	var avg *float64
	if row.ReviewCount > 0 {
		v := row.Rating
		avg = &v
	}
	return socialapp.SellerRating{Average: avg, Count: row.ReviewCount}, nil
}
