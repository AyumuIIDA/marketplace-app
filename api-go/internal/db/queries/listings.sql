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
-- 有界(8フィルタ)の検索。各条件は narg がNULLなら無効化される（Query Builder不要）。
-- ARCH-EXCEPTION(§peer): listings から social の listing_likes/listing_comments を read-only で LEFT JOIN する。
--   理由: popular(いいね順)/commented(コメント数順) は集計を ORDER BY に置く必要があり、ページング全体で
--        安定させるには同一クエリ内で集計するしかない（後段の adapter 集計では駆動不可）。表示用カウントは
--        従来どおり enrichWithCounts が担い、ここの集計は並び替え専用。denormalize 列の導入は write 経路の
--        相互結合コストが大きいため見送り、読み取りJOINに限定する。
-- 並び順は sort で選択（shuffle=seed付き決定的シャッフル / newest / popular / commented / priceAsc / priceDesc）。
-- 末尾の id DESC で常に一意なタイブレーカーを持たせ、offset ページネーションと shuffle を安定させる。
SELECT
  listings.id, listings.seller_id, listings.agent_id, listings.title, listings.description,
  listings.price, listings.currency, listings.category, listings.condition, listings.status,
  listings.signature_id, listings.created_at, listings.updated_at, listings.published_at, listings.sold_at
FROM listings
LEFT JOIN (
  SELECT listing_id, count(*) AS like_count FROM listing_likes GROUP BY listing_id
) lc ON lc.listing_id = listings.id
LEFT JOIN (
  SELECT listing_id, count(*) AS comment_count FROM listing_comments WHERE hidden_at IS NULL GROUP BY listing_id
) cc ON cc.listing_id = listings.id
LEFT JOIN users su ON su.id = listings.seller_id
WHERE (sqlc.narg('status')::listing_status IS NULL OR listings.status = sqlc.narg('status')::listing_status)
  AND (sqlc.narg('seller_id')::uuid IS NULL OR listings.seller_id = sqlc.narg('seller_id')::uuid)
  AND (sqlc.narg('category')::varchar IS NULL OR listings.category = sqlc.narg('category')::varchar)
  AND (sqlc.narg('condition')::varchar IS NULL OR listings.condition = sqlc.narg('condition')::varchar)
  AND (sqlc.narg('min_price')::integer IS NULL OR listings.price >= sqlc.narg('min_price')::integer)
  AND (sqlc.narg('max_price')::integer IS NULL OR listings.price <= sqlc.narg('max_price')::integer)
  AND (
    sqlc.narg('keyword')::text IS NULL
    OR listings.title ILIKE '%' || sqlc.narg('keyword')::text || '%'
    OR listings.description ILIKE '%' || sqlc.narg('keyword')::text || '%'
  )
  -- 「認証済みのみ」ファセット。Seal の正本＝出品者アカウントの人間認証(human_verified_at)で絞る
  -- （行為署名 signature_id ではない）。Route A: 認証済み出品者の出品は認証済みとして扱う。
  AND (sqlc.narg('signed')::boolean IS NULL OR (su.human_verified_at IS NOT NULL) = sqlc.narg('signed')::boolean)
ORDER BY
  CASE WHEN sqlc.narg('sort')::text = 'priceAsc'  THEN listings.price END ASC,
  CASE WHEN sqlc.narg('sort')::text = 'priceDesc' THEN listings.price END DESC,
  CASE WHEN sqlc.narg('sort')::text = 'popular'   THEN COALESCE(lc.like_count, 0) END DESC,
  CASE WHEN sqlc.narg('sort')::text = 'commented' THEN COALESCE(cc.comment_count, 0) END DESC,
  CASE WHEN sqlc.narg('sort')::text = 'shuffle'   THEN md5(listings.id::text || COALESCE(sqlc.narg('seed')::text, '')) END ASC,
  listings.created_at DESC,
  listings.id DESC
LIMIT sqlc.arg('result_limit')::integer OFFSET sqlc.arg('result_offset')::integer;

-- name: ListCategories :many
-- 公開中の出品のカテゴリ別件数。フロントのカテゴリ選択肢/ファセットを取得集合に依存せず提供する。
SELECT category, count(*)::bigint AS count
FROM listings
WHERE status = 'PUBLISHED'
GROUP BY category
ORDER BY count DESC, category ASC;
