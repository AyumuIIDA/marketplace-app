// Package boardinfra は掲示板 repositoryをsqlc/pgxで実装する。
package boardinfra

import (
	"context"
	"errors"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"

	"marketplace/api-go/internal/db/pgerr"
	"marketplace/api-go/internal/db/sqlc"
	boarddomain "marketplace/api-go/internal/modules/board/domain"
	"marketplace/api-go/internal/shared/pgconv"
)

type PostgresBoardRepository struct {
	q *sqlc.Queries
}

func NewPostgresBoardRepository(db sqlc.DBTX) *PostgresBoardRepository {
	return &PostgresBoardRepository{q: sqlc.New(db)}
}

func (r *PostgresBoardRepository) FindAuthor(ctx context.Context, userID uuid.UUID) (*boarddomain.AuthorInfo, error) {
	row, err := r.q.GetUserByID(ctx, userID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil
		}
		return nil, pgerr.FromPg(err)
	}
	return &boarddomain.AuthorInfo{
		DisplayName: row.DisplayName,
		AvatarURL:   row.AvatarUrl,
		Verified:    row.HumanVerifiedAt.Valid,
	}, nil
}

func (r *PostgresBoardRepository) SavePost(ctx context.Context, post *boarddomain.BoardPost) error {
	err := r.q.InsertBoardPost(ctx, sqlc.InsertBoardPostParams{
		ID:        post.ID(),
		AuthorID:  post.AuthorID(),
		Title:     post.Title(),
		Body:      post.Body(),
		CreatedAt: pgconv.Timestamptz(post.CreatedAt()),
	})
	if err != nil {
		return pgerr.FromPg(err)
	}
	return nil
}

func (r *PostgresBoardRepository) SaveReply(ctx context.Context, reply *boarddomain.BoardReply) error {
	err := r.q.InsertBoardReply(ctx, sqlc.InsertBoardReplyParams{
		ID:        reply.ID(),
		PostID:    reply.PostID(),
		AuthorID:  reply.AuthorID(),
		Body:      reply.Body(),
		CreatedAt: pgconv.Timestamptz(reply.CreatedAt()),
	})
	if err != nil {
		return pgerr.FromPg(err)
	}
	return nil
}

func (r *PostgresBoardRepository) ListPosts(ctx context.Context, limit, offset int32) ([]boarddomain.PostListItem, error) {
	rows, err := r.q.ListBoardPosts(ctx, sqlc.ListBoardPostsParams{ResultLimit: limit, ResultOffset: offset})
	if err != nil {
		return nil, pgerr.FromPg(err)
	}
	out := make([]boarddomain.PostListItem, 0, len(rows))
	for _, row := range rows {
		out = append(out, boarddomain.PostListItem{
			ID:       row.ID,
			AuthorID: row.AuthorID,
			Author: boarddomain.AuthorInfo{
				DisplayName: row.AuthorName,
				AvatarURL:   row.AuthorAvatarUrl,
				Verified:    row.AuthorVerified,
			},
			Title:      row.Title,
			Body:       row.Body,
			CreatedAt:  pgconv.Time(row.CreatedAt),
			ReplyCount: row.ReplyCount,
		})
	}
	return out, nil
}

func (r *PostgresBoardRepository) GetPost(ctx context.Context, postID uuid.UUID) (*boarddomain.PostDetail, error) {
	row, err := r.q.GetBoardPost(ctx, postID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil
		}
		return nil, pgerr.FromPg(err)
	}
	return &boarddomain.PostDetail{
		ID:       row.ID,
		AuthorID: row.AuthorID,
		Author: boarddomain.AuthorInfo{
			DisplayName: row.AuthorName,
			AvatarURL:   row.AuthorAvatarUrl,
			Verified:    row.AuthorVerified,
		},
		Title:     row.Title,
		Body:      row.Body,
		CreatedAt: pgconv.Time(row.CreatedAt),
	}, nil
}

func (r *PostgresBoardRepository) ListReplies(ctx context.Context, postID uuid.UUID) ([]boarddomain.ReplyItem, error) {
	rows, err := r.q.ListBoardReplies(ctx, postID)
	if err != nil {
		return nil, pgerr.FromPg(err)
	}
	out := make([]boarddomain.ReplyItem, 0, len(rows))
	for _, row := range rows {
		out = append(out, boarddomain.ReplyItem{
			ID:       row.ID,
			AuthorID: row.AuthorID,
			Author: boarddomain.AuthorInfo{
				DisplayName: row.AuthorName,
				AvatarURL:   row.AuthorAvatarUrl,
				Verified:    row.AuthorVerified,
			},
			Body:      row.Body,
			CreatedAt: pgconv.Time(row.CreatedAt),
		})
	}
	return out, nil
}
