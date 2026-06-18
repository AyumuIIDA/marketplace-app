-- name: InsertBoardPost :exec
INSERT INTO board_posts (id, author_id, title, body, created_at)
VALUES ($1, $2, $3, $4, $5);

-- name: InsertBoardReply :exec
INSERT INTO board_replies (id, post_id, author_id, body, created_at)
VALUES ($1, $2, $3, $4, $5);

-- name: ListBoardPosts :many
-- 新着スレッド一覧。著者表示情報と返信数を join/相関で付与。
SELECT
  p.id,
  p.author_id,
  p.title,
  p.body,
  p.created_at,
  u.display_name AS author_name,
  u.avatar_url AS author_avatar_url,
  (u.human_verified_at IS NOT NULL)::boolean AS author_verified,
  (SELECT COUNT(*) FROM board_replies r WHERE r.post_id = p.id AND r.hidden_at IS NULL)::bigint AS reply_count
FROM board_posts p
JOIN users u ON u.id = p.author_id
WHERE p.hidden_at IS NULL
ORDER BY p.created_at DESC
LIMIT sqlc.arg('result_limit')::integer OFFSET sqlc.arg('result_offset')::integer;

-- name: GetBoardPost :one
SELECT
  p.id,
  p.author_id,
  p.title,
  p.body,
  p.created_at,
  u.display_name AS author_name,
  u.avatar_url AS author_avatar_url,
  (u.human_verified_at IS NOT NULL)::boolean AS author_verified
FROM board_posts p
JOIN users u ON u.id = p.author_id
WHERE p.id = $1 AND p.hidden_at IS NULL;

-- name: ListBoardReplies :many
SELECT
  r.id,
  r.post_id,
  r.author_id,
  r.body,
  r.created_at,
  u.display_name AS author_name,
  u.avatar_url AS author_avatar_url,
  (u.human_verified_at IS NOT NULL)::boolean AS author_verified
FROM board_replies r
JOIN users u ON u.id = r.author_id
WHERE r.post_id = $1 AND r.hidden_at IS NULL
ORDER BY r.created_at ASC;
