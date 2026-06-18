package identityinfra

import (
	"context"
	"errors"

	"github.com/jackc/pgx/v5"

	"marketplace/api-go/internal/db/pgerr"
	"marketplace/api-go/internal/db/sqlc"
	identitydomain "marketplace/api-go/internal/modules/identity/domain"
	"marketplace/api-go/internal/shared/apperr"
	"marketplace/api-go/internal/shared/pgconv"
)

// PostgresAuthIdentityRepository はAuthIdentityRepositoryのpostgres実装。
type PostgresAuthIdentityRepository struct {
	q *sqlc.Queries
}

func NewPostgresAuthIdentityRepository(db sqlc.DBTX) *PostgresAuthIdentityRepository {
	return &PostgresAuthIdentityRepository{q: sqlc.New(db)}
}

func (r *PostgresAuthIdentityRepository) Save(ctx context.Context, id identitydomain.AuthIdentity) error {
	err := r.q.UpsertAuthIdentity(ctx, sqlc.UpsertAuthIdentityParams{
		ID:              id.ID,
		UserID:          id.UserID,
		Provider:        id.Provider,
		ProviderSubject: id.ProviderSubject,
		CreatedAt:       pgconv.Timestamptz(id.CreatedAt),
	})
	if err != nil {
		return pgerr.FromPg(err)
	}
	return nil
}

func (r *PostgresAuthIdentityRepository) FindByProviderSubject(ctx context.Context, provider, providerSubject string) (*identitydomain.AuthIdentity, error) {
	row, err := r.q.FindAuthIdentityByProviderSubject(ctx, sqlc.FindAuthIdentityByProviderSubjectParams{
		Provider:        provider,
		ProviderSubject: providerSubject,
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
	return &identitydomain.AuthIdentity{
		ID:              row.ID,
		UserID:          row.UserID,
		Provider:        row.Provider,
		ProviderSubject: row.ProviderSubject,
		CreatedAt:       pgconv.Time(row.CreatedAt),
	}, nil
}
