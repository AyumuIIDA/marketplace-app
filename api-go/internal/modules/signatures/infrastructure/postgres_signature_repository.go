package signaturesinfra

import (
	"context"
	"errors"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"

	"marketplace/api-go/internal/db/pgerr"
	"marketplace/api-go/internal/db/sqlc"
	signaturesdomain "marketplace/api-go/internal/modules/signatures/domain"
	"marketplace/api-go/internal/shared/apperr"
	"marketplace/api-go/internal/shared/pgconv"
)

// PostgresHumanSignatureRepository はHumanSignatureRepositoryのpostgres実装。
type PostgresHumanSignatureRepository struct {
	q *sqlc.Queries
}

func NewPostgresHumanSignatureRepository(db sqlc.DBTX) *PostgresHumanSignatureRepository {
	return &PostgresHumanSignatureRepository{q: sqlc.New(db)}
}

func (r *PostgresHumanSignatureRepository) Save(ctx context.Context, s *signaturesdomain.HumanSignature) error {
	err := r.q.InsertHumanSignature(ctx, sqlc.InsertHumanSignatureParams{
		ID:                    s.ID(),
		UserID:                s.UserID(),
		ActionType:            string(s.ActionType()),
		ResourceType:          string(s.ResourceType()),
		ResourceID:            s.ResourceID(),
		PayloadHash:           s.PayloadHash(),
		SignatureFormat:       sqlc.SignatureFormatJWS,
		SignatureValue:        s.SignatureValue(),
		WorldIDVerificationID: s.WorldIDVerificationID(),
		Status:                sqlc.SignatureStatus(s.Status()),
		SignedAt:              pgconv.Timestamptz(s.SignedAt()),
		RevokedAt:             pgconv.TimestamptzPtr(s.RevokedAt()),
	})
	if err != nil {
		return pgerr.FromPg(err)
	}
	return nil
}

func (r *PostgresHumanSignatureRepository) FindValidByResourcePayload(ctx context.Context, in signaturesdomain.FindValidInput) (*signaturesdomain.HumanSignature, error) {
	row, err := r.q.FindValidHumanSignature(ctx, sqlc.FindValidHumanSignatureParams{
		ActionType:   string(in.ActionType),
		ResourceType: string(in.ResourceType),
		ResourceID:   in.ResourceID,
		PayloadHash:  in.PayloadHash,
	})
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil
		}
		mapped := pgerr.FromPg(err)
		if apperr.IsNotFound(mapped) {
			return nil, nil
		}
		return nil, mapped
	}
	sig, err := signaturesdomain.NewValidSignature(signaturesdomain.CreateHumanSignatureInput{
		ID:                    row.ID,
		UserID:                row.UserID,
		ActionType:            signaturesdomain.SignatureAction(row.ActionType),
		ResourceType:          signaturesdomain.SignatureResource(row.ResourceType),
		ResourceID:            row.ResourceID,
		PayloadHash:           row.PayloadHash,
		SignatureValue:        row.SignatureValue,
		WorldIDVerificationID: row.WorldIDVerificationID,
		SignedAt:              pgconv.Time(row.SignedAt),
	})
	if err != nil {
		return nil, err
	}
	return sig, nil
}

// PostgresWorldIdVerificationRepository はWorldIdVerificationRepositoryのpostgres実装。
type PostgresWorldIdVerificationRepository struct {
	q *sqlc.Queries
}

func NewPostgresWorldIdVerificationRepository(db sqlc.DBTX) *PostgresWorldIdVerificationRepository {
	return &PostgresWorldIdVerificationRepository{q: sqlc.New(db)}
}

func (r *PostgresWorldIdVerificationRepository) Save(ctx context.Context, v *signaturesdomain.WorldIdVerification) error {
	err := r.q.InsertWorldIdVerification(ctx, sqlc.InsertWorldIdVerificationParams{
		ID:                v.ID(),
		UserID:            v.UserID(),
		Action:            v.Action(),
		NullifierHash:     v.NullifierHash(),
		VerificationLevel: v.VerificationLevel(),
		SignalHash:        v.SignalHash(),
		Environment:       v.Environment(),
		VerifiedAt:        pgconv.Timestamptz(v.VerifiedAt()),
		CreatedAt:         pgconv.Timestamptz(v.CreatedAt()),
	})
	if err != nil {
		return pgerr.FromPg(err)
	}
	return nil
}

func (r *PostgresWorldIdVerificationRepository) CountByUserAction(ctx context.Context, userID uuid.UUID, action string) (int64, error) {
	n, err := r.q.CountWorldIdVerificationsByUserAction(ctx, sqlc.CountWorldIdVerificationsByUserActionParams{
		UserID: userID,
		Action: action,
	})
	if err != nil {
		return 0, pgerr.FromPg(err)
	}
	return n, nil
}
