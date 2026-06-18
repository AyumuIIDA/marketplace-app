// Package identityinfra はidentityのrepositoryをsqlc/pgxで実装する。
package identityinfra

import (
	"context"
	"errors"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"

	"marketplace/api-go/internal/db/pgerr"
	"marketplace/api-go/internal/db/sqlc"
	identitydomain "marketplace/api-go/internal/modules/identity/domain"
	"marketplace/api-go/internal/shared/pgconv"
)

// PostgresUserRepository はUserRepositoryのpostgres実装。
// constructorで受けたDBTX（pool or tx）で実行するだけで、tx境界は持たない（§10/§11）。
type PostgresUserRepository struct {
	q *sqlc.Queries
}

func NewPostgresUserRepository(db sqlc.DBTX) *PostgresUserRepository {
	return &PostgresUserRepository{q: sqlc.New(db)}
}

func (r *PostgresUserRepository) Save(ctx context.Context, user *identitydomain.User) error {
	err := r.q.UpsertUser(ctx, sqlc.UpsertUserParams{
		ID:              user.ID(),
		DisplayName:     user.DisplayName(),
		Email:           user.Email(),
		AvatarUrl:       user.AvatarURL(),
		Status:          sqlc.UserStatus(user.Status()),
		HumanVerifiedAt: pgconv.TimestamptzPtr(user.HumanVerifiedAt()),
		CreatedAt:       pgconv.Timestamptz(user.CreatedAt()),
		UpdatedAt:       pgconv.Timestamptz(user.UpdatedAt()),
	})
	if err != nil {
		return pgerr.FromPg(err)
	}
	return nil
}

func (r *PostgresUserRepository) FindByID(ctx context.Context, id uuid.UUID) (*identitydomain.User, error) {
	row, err := r.q.GetUserByID(ctx, id)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil
		}
		return nil, pgerr.FromPg(err)
	}
	return mapUserRow(row), nil
}

func (r *PostgresUserRepository) FindByEmail(ctx context.Context, email string) (*identitydomain.User, error) {
	row, err := r.q.GetUserByEmail(ctx, &email)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil
		}
		return nil, pgerr.FromPg(err)
	}
	return mapUserRow(row), nil
}

func mapUserRow(row sqlc.User) *identitydomain.User {
	return identitydomain.RehydrateUser(identitydomain.RehydrateUserInput{
		ID:              row.ID,
		DisplayName:     row.DisplayName,
		Email:           row.Email,
		AvatarURL:       row.AvatarUrl,
		Status:          identitydomain.UserStatus(row.Status),
		HumanVerifiedAt: pgconv.TimePtr(row.HumanVerifiedAt),
		CreatedAt:       pgconv.Time(row.CreatedAt),
		UpdatedAt:       pgconv.Time(row.UpdatedAt),
	})
}
