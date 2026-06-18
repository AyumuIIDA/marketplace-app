-- name: LikeListing :exec
INSERT INTO listing_likes (user_id, listing_id) VALUES ($1, $2)
ON CONFLICT (user_id, listing_id) DO NOTHING;

-- name: UnlikeListing :exec
DELETE FROM listing_likes WHERE user_id = $1 AND listing_id = $2;

-- name: CountListingLikes :one
SELECT count(*) FROM listing_likes WHERE listing_id = $1;

-- name: IsListingLiked :one
SELECT EXISTS (SELECT 1 FROM listing_likes WHERE user_id = $1 AND listing_id = $2);

-- name: ListLikedListingIDs :many
SELECT listing_id FROM listing_likes
WHERE user_id = $1
ORDER BY created_at DESC
LIMIT sqlc.arg('result_limit')::integer OFFSET sqlc.arg('result_offset')::integer;

-- name: LikeSeller :exec
INSERT INTO seller_likes (user_id, seller_id) VALUES ($1, $2)
ON CONFLICT (user_id, seller_id) DO NOTHING;

-- name: UnlikeSeller :exec
DELETE FROM seller_likes WHERE user_id = $1 AND seller_id = $2;

-- name: CountSellerLikes :one
SELECT count(*) FROM seller_likes WHERE seller_id = $1;

-- name: IsSellerLiked :one
SELECT EXISTS (SELECT 1 FROM seller_likes WHERE user_id = $1 AND seller_id = $2);

-- name: ListLikedSellerIDs :many
SELECT seller_id FROM seller_likes
WHERE user_id = $1
ORDER BY created_at DESC
LIMIT sqlc.arg('result_limit')::integer OFFSET sqlc.arg('result_offset')::integer;

-- name: GetSellerProfile :one
SELECT display_name, avatar_url, (human_verified_at IS NOT NULL)::boolean AS human_verified
FROM users WHERE id = $1;

-- name: GetSellerRating :one
-- SUBMITTED(World ID署名済み)のみ集計。レビュー0件は review_count=0 で表し、
-- AVG の NULL を COALESCE(...,0) で潰す（float64非null）。0件→Average=nil の判定は repo 側で行う。
SELECT COALESCE(AVG(rating::float8), 0)::float8 AS rating, count(*) AS review_count
FROM reviews WHERE reviewee_id = $1 AND status = 'SUBMITTED';
