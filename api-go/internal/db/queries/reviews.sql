-- name: UpsertReview :exec
INSERT INTO reviews (
    id, order_id, reviewer_id, reviewee_id, agent_id, rating, comment,
    status, signature_id, created_at, submitted_at, hidden_at
) VALUES (
    $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12
)
ON CONFLICT (id) DO UPDATE SET
    rating = EXCLUDED.rating,
    comment = EXCLUDED.comment,
    status = EXCLUDED.status,
    signature_id = EXCLUDED.signature_id,
    submitted_at = EXCLUDED.submitted_at,
    hidden_at = EXCLUDED.hidden_at;

-- name: GetReviewByID :one
SELECT * FROM reviews WHERE id = $1;

-- name: FindSubmittedReviewByOrderReviewer :one
SELECT * FROM reviews
WHERE order_id = $1 AND reviewer_id = $2 AND status = 'SUBMITTED'
LIMIT 1;

-- name: SearchReviews :many
SELECT * FROM reviews
WHERE (sqlc.narg('order_id')::uuid IS NULL OR order_id = sqlc.narg('order_id')::uuid)
  AND (sqlc.narg('reviewer_id')::uuid IS NULL OR reviewer_id = sqlc.narg('reviewer_id')::uuid)
  AND (sqlc.narg('reviewee_id')::uuid IS NULL OR reviewee_id = sqlc.narg('reviewee_id')::uuid)
  AND (sqlc.narg('status')::review_status IS NULL OR status = sqlc.narg('status')::review_status)
ORDER BY created_at ASC
LIMIT sqlc.arg('result_limit')::integer;
