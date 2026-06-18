-- name: InsertDirectMessage :exec
INSERT INTO direct_messages (id, sender_id, recipient_id, body, status, created_at)
VALUES ($1, $2, $3, $4, $5, $6);

-- name: ListDirectThread :many
-- 自分(user_a)と相手(user_b)の双方向スレッドを時系列で取得。
SELECT * FROM direct_messages
WHERE status <> 'HIDDEN'
  AND (
    (sender_id = sqlc.arg('user_a')::uuid AND recipient_id = sqlc.arg('user_b')::uuid)
    OR (sender_id = sqlc.arg('user_b')::uuid AND recipient_id = sqlc.arg('user_a')::uuid)
  )
ORDER BY created_at ASC
LIMIT sqlc.arg('result_limit')::integer;

-- name: ListInbox :many
-- 相手(peer)ごとの最新メッセージ。受信箱の一覧表示用。
SELECT DISTINCT ON (peer)
  peer,
  dm.id,
  dm.sender_id,
  dm.recipient_id,
  dm.body,
  dm.read_at,
  dm.created_at
FROM (
  SELECT *, (CASE WHEN sender_id = sqlc.arg('me')::uuid THEN recipient_id ELSE sender_id END)::uuid AS peer
  FROM direct_messages
  WHERE status <> 'HIDDEN' AND (sender_id = sqlc.arg('me')::uuid OR recipient_id = sqlc.arg('me')::uuid)
) dm
ORDER BY peer, dm.created_at DESC;

-- name: CountUnreadBySender :many
-- 自分宛の未読を相手(sender)ごとに集計。受信箱の未読バッジ用。
SELECT sender_id, COUNT(*)::bigint AS unread
FROM direct_messages
WHERE recipient_id = $1 AND read_at IS NULL AND status <> 'HIDDEN'
GROUP BY sender_id;

-- name: MarkDirectThreadRead :exec
-- 相手から自分宛の未読を既読化。
UPDATE direct_messages
SET read_at = sqlc.arg('read_at')
WHERE recipient_id = sqlc.arg('me')::uuid
  AND sender_id = sqlc.arg('peer')::uuid
  AND read_at IS NULL;
