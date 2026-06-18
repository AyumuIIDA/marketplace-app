-- name: UpsertAgent :exec
INSERT INTO agents (id, user_id, name, status, created_at, updated_at)
VALUES ($1, $2, $3, $4, $5, $6)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    status = EXCLUDED.status,
    updated_at = EXCLUDED.updated_at;

-- name: GetAgentByID :one
SELECT * FROM agents WHERE id = $1;

-- name: SearchAgents :many
SELECT * FROM agents
WHERE (sqlc.narg('user_id')::uuid IS NULL OR user_id = sqlc.narg('user_id')::uuid)
  AND (sqlc.narg('status')::agent_status IS NULL OR status = sqlc.narg('status')::agent_status)
ORDER BY created_at ASC
LIMIT sqlc.arg('result_limit')::integer;
