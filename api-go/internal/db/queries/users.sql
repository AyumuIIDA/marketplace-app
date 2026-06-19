-- name: GetUserByID :one
SELECT * FROM users WHERE id = $1;

-- name: GetUserByEmail :one
SELECT * FROM users WHERE email = $1;

-- name: UpsertUser :exec
INSERT INTO users (id, display_name, email, avatar_url, status, human_verified_at, created_at, updated_at)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
ON CONFLICT (id) DO UPDATE SET
    display_name = EXCLUDED.display_name,
    email = EXCLUDED.email,
    avatar_url = EXCLUDED.avatar_url,
    status = EXCLUDED.status,
    human_verified_at = EXCLUDED.human_verified_at,
    updated_at = EXCLUDED.updated_at;

-- name: MarkUserHumanVerified :exec
UPDATE users SET human_verified_at = $2, updated_at = $3 WHERE id = $1;

-- name: ListHumanVerifiedByIDs :many
-- 指定ユーザーの人間認証状態をバッチ取得する。出品カード等で出品者の認証マーク(Seal)を
-- 出すために listings 側 enrich から呼ばれる（Seal の正本はアカウント認証＝human_verified_at）。
SELECT id, (human_verified_at IS NOT NULL)::boolean AS human_verified
FROM users
WHERE id = ANY(sqlc.arg('user_ids')::uuid[]);
