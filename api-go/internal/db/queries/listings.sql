-- name: UpsertListing :exec
INSERT INTO listings (
    id, seller_id, agent_id, title, description, price, currency, category, condition,
    status, signature_id, created_at, updated_at, published_at, sold_at
) VALUES (
    $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15
)
ON CONFLICT (id) DO UPDATE SET
    title = EXCLUDED.title,
    description = EXCLUDED.description,
    price = EXCLUDED.price,
    currency = EXCLUDED.currency,
    category = EXCLUDED.category,
    condition = EXCLUDED.condition,
    status = EXCLUDED.status,
    signature_id = EXCLUDED.signature_id,
    updated_at = EXCLUDED.updated_at,
    published_at = EXCLUDED.published_at,
    sold_at = EXCLUDED.sold_at;

-- name: GetListingByID :one
SELECT * FROM listings WHERE id = $1;

-- name: GetListingsByIDs :many
-- 指定idの出品をまとめて取得（いいねした商品一覧のhydrate用。順序は呼び出し側で復元）。
SELECT * FROM listings WHERE id = ANY(sqlc.arg('ids')::uuid[]);

-- name: ClaimListingForPurchase :one
-- 公開中かつ出品者≠購入者の出品を原子的にSOLDへ遷移し、claim行を返す。
-- 競合(二重購入)時は条件に合致せず0行 → 呼び出し側がgetPurchasableListingで理由を判定。
UPDATE listings
SET status = 'SOLD', sold_at = sqlc.arg('sold_at'), updated_at = sqlc.arg('sold_at')
WHERE id = sqlc.arg('listing_id')
  AND status = 'PUBLISHED'
  AND seller_id <> sqlc.arg('buyer_id')
RETURNING *;

-- name: InsertListingImages :copyfrom
-- 出品作成時の画像添付を1往復でバッチ挿入する（pgx CopyFrom）。
INSERT INTO listing_images (listing_id, url, image_hash, sort_order)
VALUES ($1, $2, $3, $4);

-- name: ListImagesByListingIDs :many
SELECT listing_id, url, sort_order
FROM listing_images
WHERE listing_id = ANY(sqlc.arg('listing_ids')::uuid[])
ORDER BY sort_order ASC;

-- name: SearchListings :many
-- 有界(7フィルタ)の検索。各条件は narg がNULLなら無効化される（Query Builder不要）。
SELECT * FROM listings
WHERE (sqlc.narg('status')::listing_status IS NULL OR status = sqlc.narg('status')::listing_status)
  AND (sqlc.narg('seller_id')::uuid IS NULL OR seller_id = sqlc.narg('seller_id')::uuid)
  AND (sqlc.narg('category')::varchar IS NULL OR category = sqlc.narg('category')::varchar)
  AND (sqlc.narg('condition')::varchar IS NULL OR condition = sqlc.narg('condition')::varchar)
  AND (sqlc.narg('min_price')::integer IS NULL OR price >= sqlc.narg('min_price')::integer)
  AND (sqlc.narg('max_price')::integer IS NULL OR price <= sqlc.narg('max_price')::integer)
  AND (
    sqlc.narg('keyword')::text IS NULL
    OR title ILIKE '%' || sqlc.narg('keyword')::text || '%'
    OR description ILIKE '%' || sqlc.narg('keyword')::text || '%'
  )
ORDER BY created_at ASC
LIMIT sqlc.arg('result_limit')::integer OFFSET sqlc.arg('result_offset')::integer;
