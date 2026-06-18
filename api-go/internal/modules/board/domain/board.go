// Package boarddomain は掲示板（2ch風のスレッド＋レス）のdomainモデルとrepository portを定義する。
package boarddomain

import (
	"context"
	"strings"
	"time"

	"github.com/google/uuid"

	"marketplace/api-go/internal/shared/apperr"
)

const (
	maxTitleLen = 120
	maxBodyLen  = 5000
)

// BoardPost はスレッド（投稿）Entity。
type BoardPost struct {
	id        uuid.UUID
	authorID  uuid.UUID
	title     string
	body      string
	createdAt time.Time
}

func NewBoardPost(id, authorID uuid.UUID, title, body string, now time.Time) (*BoardPost, error) {
	t := strings.TrimSpace(title)
	if t == "" {
		return nil, apperr.Validation("Title is required.", apperr.FieldError{Field: "title", Reason: "required"})
	}
	if len([]rune(t)) > maxTitleLen {
		return nil, apperr.Validation("Title is too long.", apperr.FieldError{Field: "title", Reason: "too_long"})
	}
	b := strings.TrimSpace(body)
	if b == "" {
		return nil, apperr.Validation("Body is required.", apperr.FieldError{Field: "body", Reason: "required"})
	}
	if len([]rune(b)) > maxBodyLen {
		return nil, apperr.Validation("Body is too long.", apperr.FieldError{Field: "body", Reason: "too_long"})
	}
	return &BoardPost{id: id, authorID: authorID, title: t, body: b, createdAt: now}, nil
}

func (p *BoardPost) ID() uuid.UUID        { return p.id }
func (p *BoardPost) AuthorID() uuid.UUID  { return p.authorID }
func (p *BoardPost) Title() string        { return p.title }
func (p *BoardPost) Body() string         { return p.body }
func (p *BoardPost) CreatedAt() time.Time { return p.createdAt }

// BoardReply はレス（返信）Entity。
type BoardReply struct {
	id        uuid.UUID
	postID    uuid.UUID
	authorID  uuid.UUID
	body      string
	createdAt time.Time
}

func NewBoardReply(id, postID, authorID uuid.UUID, body string, now time.Time) (*BoardReply, error) {
	b := strings.TrimSpace(body)
	if b == "" {
		return nil, apperr.Validation("Body is required.", apperr.FieldError{Field: "body", Reason: "required"})
	}
	if len([]rune(b)) > maxBodyLen {
		return nil, apperr.Validation("Body is too long.", apperr.FieldError{Field: "body", Reason: "too_long"})
	}
	return &BoardReply{id: id, postID: postID, authorID: authorID, body: b, createdAt: now}, nil
}

func (r *BoardReply) ID() uuid.UUID        { return r.id }
func (r *BoardReply) PostID() uuid.UUID    { return r.postID }
func (r *BoardReply) AuthorID() uuid.UUID  { return r.authorID }
func (r *BoardReply) Body() string         { return r.body }
func (r *BoardReply) CreatedAt() time.Time { return r.createdAt }

// --- 読み取りモデル（著者表示情報を含む） ---

type AuthorInfo struct {
	DisplayName string
	AvatarURL   *string
	Verified    bool
}

type PostListItem struct {
	ID         uuid.UUID
	Author     AuthorInfo
	AuthorID   uuid.UUID
	Title      string
	Body       string
	CreatedAt  time.Time
	ReplyCount int64
}

type PostDetail struct {
	ID        uuid.UUID
	Author    AuthorInfo
	AuthorID  uuid.UUID
	Title     string
	Body      string
	CreatedAt time.Time
}

type ReplyItem struct {
	ID        uuid.UUID
	Author    AuthorInfo
	AuthorID  uuid.UUID
	Body      string
	CreatedAt time.Time
}

// Repository は掲示板の永続化port。
type Repository interface {
	FindAuthor(ctx context.Context, userID uuid.UUID) (*AuthorInfo, error)
	SavePost(ctx context.Context, post *BoardPost) error
	SaveReply(ctx context.Context, reply *BoardReply) error
	ListPosts(ctx context.Context, limit, offset int32) ([]PostListItem, error)
	GetPost(ctx context.Context, postID uuid.UUID) (*PostDetail, error)
	ListReplies(ctx context.Context, postID uuid.UUID) ([]ReplyItem, error)
}
