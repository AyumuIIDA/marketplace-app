-- name: UpsertOrder :exec
-- listing_title / listing_image_url は購入時の商品スナップショット。状態更新(ON CONFLICT)では
-- 上書きしない（焼き付けた値を保持する）。
INSERT INTO orders (
    id, listing_id, buyer_id, seller_id, status, price, currency,
    listing_title, listing_image_url,
    created_at, paid_at, shipped_at, received_at, completed_at, canceled_at
) VALUES (
    $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15
)
ON CONFLICT (id) DO UPDATE SET
    status = EXCLUDED.status,
    shipped_at = EXCLUDED.shipped_at,
    received_at = EXCLUDED.received_at,
    completed_at = EXCLUDED.completed_at,
    canceled_at = EXCLUDED.canceled_at;

-- name: GetOrderByID :one
SELECT * FROM orders WHERE id = $1;

-- name: GetOrderByListingID :one
SELECT * FROM orders WHERE listing_id = $1;

-- name: SearchOrders :many
-- 有界検索。participant_id は buyer/seller どちらか一致でフィルタ。
SELECT * FROM orders
WHERE (
    sqlc.narg('participant_id')::uuid IS NULL
    OR buyer_id = sqlc.narg('participant_id')::uuid
    OR seller_id = sqlc.narg('participant_id')::uuid
  )
  AND (sqlc.narg('buyer_id')::uuid IS NULL OR buyer_id = sqlc.narg('buyer_id')::uuid)
  AND (sqlc.narg('seller_id')::uuid IS NULL OR seller_id = sqlc.narg('seller_id')::uuid)
  AND (sqlc.narg('status')::order_status IS NULL OR status = sqlc.narg('status')::order_status)
ORDER BY created_at DESC
LIMIT sqlc.arg('result_limit')::integer;
