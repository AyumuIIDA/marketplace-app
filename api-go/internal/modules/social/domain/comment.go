package socialdomain

import (
	"strings"
	"time"

	"github.com/google/uuid"

	"marketplace/api-go/internal/shared/apperr"
)

// commentMaxLen は出品コメント本文の上限。
const commentMaxLen = 1000

// Comment は出品への公開コメント。投稿可否(人間性検証)は usecase で強制する。
type Comment struct {
	id        uuid.UUID
	listingID uuid.UUID
	authorID  uuid.UUID
	body      string
	createdAt time.Time
}

// NewComment は本文を検証してコメントを生成する。
func NewComment(id, listingID, authorID uuid.UUID, body string, now time.Time) (*Comment, error) {
	trimmed := strings.TrimSpace(body)
	if trimmed == "" {
		return nil, apperr.Validation("Comment body is required.", apperr.FieldError{Field: "body", Reason: "required"})
	}
	if len([]rune(trimmed)) > commentMaxLen {
		return nil, apperr.Validation("Comment body is too long.", apperr.FieldError{Field: "body", Reason: "max"})
	}
	return &Comment{id: id, listingID: listingID, authorID: authorID, body: trimmed, createdAt: now}, nil
}

func (c *Comment) ID() uuid.UUID        { return c.id }
func (c *Comment) ListingID() uuid.UUID { return c.listingID }
func (c *Comment) AuthorID() uuid.UUID  { return c.authorID }
func (c *Comment) Body() string         { return c.body }
func (c *Comment) CreatedAt() time.Time { return c.createdAt }
