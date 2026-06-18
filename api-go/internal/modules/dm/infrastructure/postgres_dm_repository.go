// Package dminfra はDM repositoryをsqlc/pgxで実装する。
package dminfra

import (
	"context"
	"time"

	"github.com/google/uuid"

	"marketplace/api-go/internal/db/pgerr"
	"marketplace/api-go/internal/db/sqlc"
	dmdomain "marketplace/api-go/internal/modules/dm/domain"
	"marketplace/api-go/internal/shared/pgconv"
)

// PostgresDirectMessageRepository は dmdomain.Repository の postgres 実装。
type PostgresDirectMessageRepository struct {
	q *sqlc.Queries
}

func NewPostgresDirectMessageRepository(db sqlc.DBTX) *PostgresDirectMessageRepository {
	return &PostgresDirectMessageRepository{q: sqlc.New(db)}
}

func (r *PostgresDirectMessageRepository) Save(ctx context.Context, m *dmdomain.DirectMessage) error {
	err := r.q.InsertDirectMessage(ctx, sqlc.InsertDirectMessageParams{
		ID:          m.ID(),
		SenderID:    m.SenderID(),
		RecipientID: m.RecipientID(),
		Body:        m.Body(),
		Status:      sqlc.MessageStatus("SENT"),
		CreatedAt:   pgconv.Timestamptz(m.CreatedAt()),
	})
	if err != nil {
		return pgerr.FromPg(err)
	}
	return nil
}

func (r *PostgresDirectMessageRepository) ListThread(ctx context.Context, userA, userB uuid.UUID, limit int32) ([]*dmdomain.DirectMessage, error) {
	if limit <= 0 {
		limit = 100
	}
	rows, err := r.q.ListDirectThread(ctx, sqlc.ListDirectThreadParams{UserA: userA, UserB: userB, ResultLimit: limit})
	if err != nil {
		return nil, pgerr.FromPg(err)
	}
	out := make([]*dmdomain.DirectMessage, 0, len(rows))
	for _, row := range rows {
		out = append(out, dmdomain.Rehydrate(dmdomain.RehydrateInput{
			ID:          row.ID,
			SenderID:    row.SenderID,
			RecipientID: row.RecipientID,
			Body:        row.Body,
			ReadAt:      pgconv.TimePtr(row.ReadAt),
			CreatedAt:   pgconv.Time(row.CreatedAt),
		}))
	}
	return out, nil
}

func (r *PostgresDirectMessageRepository) ListInbox(ctx context.Context, me uuid.UUID) ([]dmdomain.InboxItem, error) {
	rows, err := r.q.ListInbox(ctx, me)
	if err != nil {
		return nil, pgerr.FromPg(err)
	}
	unreadRows, err := r.q.CountUnreadBySender(ctx, me)
	if err != nil {
		return nil, pgerr.FromPg(err)
	}
	unread := make(map[uuid.UUID]int64, len(unreadRows))
	for _, u := range unreadRows {
		unread[u.SenderID] = u.Unread
	}
	out := make([]dmdomain.InboxItem, 0, len(rows))
	for _, row := range rows {
		out = append(out, dmdomain.InboxItem{
			PeerID:       row.Peer,
			Body:         row.Body,
			LastSenderID: row.SenderID,
			CreatedAt:    pgconv.Time(row.CreatedAt),
			Unread:       unread[row.Peer],
		})
	}
	return out, nil
}

func (r *PostgresDirectMessageRepository) MarkThreadRead(ctx context.Context, me, peer uuid.UUID, now time.Time) error {
	err := r.q.MarkDirectThreadRead(ctx, sqlc.MarkDirectThreadReadParams{
		ReadAt: pgconv.Timestamptz(now),
		Me:     me,
		Peer:   peer,
	})
	if err != nil {
		return pgerr.FromPg(err)
	}
	return nil
}
