// Package messagesinfra はDMのrepositoryをsqlc/pgxで実装する。
package messagesinfra

import (
	"context"
	"errors"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"

	"marketplace/api-go/internal/db/pgerr"
	"marketplace/api-go/internal/db/sqlc"
	messagesdomain "marketplace/api-go/internal/modules/messages/domain"
	"marketplace/api-go/internal/shared/apperr"
	"marketplace/api-go/internal/shared/pgconv"
)

// PostgresMessageRepository はMessageRepositoryのpostgres実装。
// constructorで受けたDBTX（pool or tx）で実行する（§10/§11）。
type PostgresMessageRepository struct {
	q *sqlc.Queries
}

func NewPostgresMessageRepository(db sqlc.DBTX) *PostgresMessageRepository {
	return &PostgresMessageRepository{q: sqlc.New(db)}
}

func (r *PostgresMessageRepository) Save(ctx context.Context, m *messagesdomain.Message) error {
	err := r.q.UpsertMessage(ctx, sqlc.UpsertMessageParams{
		ID:          m.ID(),
		OrderID:     m.OrderID(),
		SenderID:    m.SenderID(),
		RecipientID: m.RecipientID(),
		AgentID:     m.AgentID(),
		Body:        m.Body(),
		Status:      sqlc.MessageStatus(m.Status()),
		CreatedAt:   pgconv.Timestamptz(m.CreatedAt()),
		HiddenAt:    pgconv.TimestamptzPtr(m.HiddenAt()),
	})
	if err != nil {
		return pgerr.FromPg(err)
	}
	return nil
}

func (r *PostgresMessageRepository) FindByID(ctx context.Context, id uuid.UUID) (*messagesdomain.Message, error) {
	row, err := r.q.GetMessageByID(ctx, id)
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
	return mapMessageRow(row), nil
}

func (r *PostgresMessageRepository) Search(ctx context.Context, in messagesdomain.SearchInput) ([]*messagesdomain.Message, error) {
	var status *sqlc.MessageStatus
	if in.Status != nil {
		s := sqlc.MessageStatus(*in.Status)
		status = &s
	}
	limit := int32(50)
	if in.Limit != nil {
		limit = *in.Limit
	}
	rows, err := r.q.SearchMessages(ctx, sqlc.SearchMessagesParams{
		OrderID:       in.OrderID,
		ParticipantID: in.ParticipantID,
		SenderID:      in.SenderID,
		RecipientID:   in.RecipientID,
		Status:        status,
		ResultLimit:   limit,
	})
	if err != nil {
		return nil, pgerr.FromPg(err)
	}
	out := make([]*messagesdomain.Message, 0, len(rows))
	for _, row := range rows {
		out = append(out, mapMessageRow(row))
	}
	return out, nil
}

func mapMessageRow(row sqlc.Message) *messagesdomain.Message {
	return messagesdomain.Rehydrate(messagesdomain.RehydrateInput{
		ID:          row.ID,
		OrderID:     row.OrderID,
		SenderID:    row.SenderID,
		RecipientID: row.RecipientID,
		AgentID:     row.AgentID,
		Body:        row.Body,
		Status:      messagesdomain.MessageStatus(row.Status),
		CreatedAt:   pgconv.Time(row.CreatedAt),
		HiddenAt:    pgconv.TimePtr(row.HiddenAt),
	})
}
