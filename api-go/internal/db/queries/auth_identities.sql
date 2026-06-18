-- name: FindAuthIdentityByProviderSubject :one
SELECT * FROM auth_identities WHERE provider = $1 AND provider_subject = $2;

-- name: UpsertAuthIdentity :exec
INSERT INTO auth_identities (id, user_id, provider, provider_subject, created_at)
VALUES ($1, $2, $3, $4, $5)
ON CONFLICT (provider, provider_subject) DO UPDATE SET
    user_id = EXCLUDED.user_id;
