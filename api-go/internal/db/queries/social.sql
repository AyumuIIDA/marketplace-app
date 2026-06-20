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

-- name: InsertListingComment :exec
INSERT INTO listing_comments (id, listing_id, author_id, body) VALUES ($1, $2, $3, $4);

-- name: ListCommentsByListing :many
-- 公開コメントを新しい順に。著者の表示名/本人認証バッジを users から join。
SELECT c.id, c.listing_id, c.author_id, c.body, c.created_at,
       u.display_name AS author_display_name,
       (u.human_verified_at IS NOT NULL)::boolean AS author_human_verified
FROM listing_comments c
JOIN users u ON u.id = c.author_id
WHERE c.listing_id = $1 AND c.hidden_at IS NULL
ORDER BY c.created_at DESC
LIMIT sqlc.arg('result_limit')::integer OFFSET sqlc.arg('result_offset')::integer;

-- name: CountCommentsByListing :one
SELECT count(*) FROM listing_comments WHERE listing_id = $1 AND hidden_at IS NULL;

-- name: CountLikesByListingIDs :many
-- フィード用バッチ集計。指定id群のいいね数をまとめて返す（0件のidは行が出ない＝呼び出し側で0補完）。
SELECT listing_id, count(*) AS like_count
FROM listing_likes
WHERE listing_id = ANY(sqlc.arg('listing_ids')::uuid[])
GROUP BY listing_id;

-- name: CountCommentsByListingIDs :many
SELECT listing_id, count(*) AS comment_count
FROM listing_comments
WHERE hidden_at IS NULL AND listing_id = ANY(sqlc.arg('listing_ids')::uuid[])
GROUP BY listing_id;

-- name: GetSellerRating :one
-- SUBMITTED(World ID署名済み)のみ集計。レビュー0件は review_count=0 で表し、
-- AVG の NULL を COALESCE(...,0) で潰す（float64非null）。0件→Average=nil の判定は repo 側で行う。
SELECT COALESCE(AVG(rating::float8), 0)::float8 AS rating, count(*) AS review_count
FROM reviews WHERE reviewee_id = $1 AND status = 'SUBMITTED';

-- 商品の保存（私的ウォッチリスト）。冪等。
-- name: SaveListing :exec
INSERT INTO listing_saves (user_id, listing_id) VALUES ($1, $2)
ON CONFLICT (user_id, listing_id) DO NOTHING;

-- name: UnsaveListing :exec
DELETE FROM listing_saves WHERE user_id = $1 AND listing_id = $2;

-- name: IsListingSaved :one
SELECT EXISTS (SELECT 1 FROM listing_saves WHERE user_id = $1 AND listing_id = $2);

-- name: ListSavedListingIDs :many
SELECT listing_id FROM listing_saves
WHERE user_id = $1
ORDER BY created_at DESC
LIMIT sqlc.arg('result_limit')::integer OFFSET sqlc.arg('result_offset')::integer;

-- 出品者のフォロー（私的）。冪等。
-- name: FollowSeller :exec
INSERT INTO seller_follows (follower_id, seller_id) VALUES ($1, $2)
ON CONFLICT (follower_id, seller_id) DO NOTHING;

-- name: UnfollowSeller :exec
DELETE FROM seller_follows WHERE follower_id = $1 AND seller_id = $2;

-- name: IsFollowingSeller :one
SELECT EXISTS (SELECT 1 FROM seller_follows WHERE follower_id = $1 AND seller_id = $2);

-- name: ListFollowedSellerIDs :many
SELECT seller_id FROM seller_follows
WHERE follower_id = $1
ORDER BY created_at DESC
LIMIT sqlc.arg('result_limit')::integer OFFSET sqlc.arg('result_offset')::integer;
