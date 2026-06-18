-- name: InsertWorldIdVerification :exec
INSERT INTO world_id_verifications (
    id, user_id, action, nullifier_hash, verification_level, signal_hash, environment, verified_at, created_at
) VALUES (
    $1, $2, $3, $4, $5, $6, $7, $8, $9
);

-- name: CountWorldIdVerificationsByUserAction :one
SELECT count(*) FROM world_id_verifications WHERE user_id = $1 AND action = $2;

-- name: InsertHumanSignature :exec
INSERT INTO human_signatures (
    id, user_id, action_type, resource_type, resource_id, payload_hash,
    signature_format, signature_value, world_id_verification_id, status, signed_at, revoked_at
) VALUES (
    $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12
)
ON CONFLICT (id) DO UPDATE SET
    status = EXCLUDED.status,
    revoked_at = EXCLUDED.revoked_at;

-- name: FindValidHumanSignature :one
SELECT * FROM human_signatures
WHERE action_type = $1
  AND resource_type = $2
  AND resource_id = $3
  AND payload_hash = $4
  AND status = 'VALID'
LIMIT 1;
