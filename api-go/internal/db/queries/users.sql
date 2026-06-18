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
