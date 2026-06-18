-- name: UpsertMessage :exec
INSERT INTO messages (
    id, order_id, sender_id, recipient_id, agent_id, body, status, created_at, hidden_at
) VALUES (
    $1, $2, $3, $4, $5, $6, $7, $8, $9
)
ON CONFLICT (id) DO UPDATE SET
    status = EXCLUDED.status,
    hidden_at = EXCLUDED.hidden_at;

-- name: GetMessageByID :one
SELECT * FROM messages WHERE id = $1;

-- name: SearchMessages :many
-- 有界検索。participant_id は sender/recipient どちらか一致でフィルタ。
SELECT * FROM messages
WHERE (sqlc.narg('order_id')::uuid IS NULL OR order_id = sqlc.narg('order_id')::uuid)
  AND (
    sqlc.narg('participant_id')::uuid IS NULL
    OR sender_id = sqlc.narg('participant_id')::uuid
    OR recipient_id = sqlc.narg('participant_id')::uuid
  )
  AND (sqlc.narg('sender_id')::uuid IS NULL OR sender_id = sqlc.narg('sender_id')::uuid)
  AND (sqlc.narg('recipient_id')::uuid IS NULL OR recipient_id = sqlc.narg('recipient_id')::uuid)
  AND (sqlc.narg('status')::message_status IS NULL OR status = sqlc.narg('status')::message_status)
ORDER BY created_at ASC
LIMIT sqlc.arg('result_limit')::integer;
