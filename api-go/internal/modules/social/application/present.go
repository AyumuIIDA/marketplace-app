package socialapp

import (
	"time"

	"github.com/google/uuid"
)

// LikeStatusView は いいねトグル応答（件数と自分の状態）。
type LikeStatusView struct {
	LikeCount int64 `json:"likeCount"`
	LikedByMe bool  `json:"likedByMe"`
}

// CommentView は出品コメントの応答（著者表示名/本人認証バッジ付き）。
type CommentView struct {
	CommentID           string    `json:"commentId"`
	ListingID           string    `json:"listingId"`
	AuthorID            string    `json:"authorId"`
	AuthorDisplayName   string    `json:"authorDisplayName"`
	AuthorHumanVerified bool      `json:"authorHumanVerified"`
	Body                string    `json:"body"`
	CreatedAt           time.Time `json:"createdAt"`
}

// CommentsView はコメント一覧応答。
type CommentsView struct {
	Items []CommentView `json:"items"`
}

func presentComment(r CommentRow) CommentView {
	return CommentView{
		CommentID:           r.CommentID.String(),
		ListingID:           r.ListingID.String(),
		AuthorID:            r.AuthorID.String(),
		AuthorDisplayName:   r.AuthorDisplayName,
		AuthorHumanVerified: r.AuthorHumanVerified,
		Body:                r.Body,
		CreatedAt:           r.CreatedAt,
	}
}

// SellerSummaryView は出品者表示UIの応答（既存フロント互換のcamelCase）。
// Rating は評価0件のとき null（omitemptyを付けず明示的にnullを返す）。
type SellerSummaryView struct {
	SellerID      string   `json:"sellerId"`
	Handle        string   `json:"handle"`
	DisplayName   string   `json:"displayName"`
	AvatarURL     *string  `json:"avatarUrl,omitempty"`
	HumanVerified bool     `json:"humanVerified"`
	Rating        *float64 `json:"rating"`
	ReviewCount   int64    `json:"reviewCount"`
	LikeCount     int64    `json:"likeCount"`
	LikedByMe     bool     `json:"likedByMe"`
}

// handleFromID は出品者idから安定したhandle(@先頭8桁)を導出する。
// 表示名とは別に、id由来の短い識別子をUIへ提供する。
func handleFromID(id uuid.UUID) string {
	return "@" + id.String()[:8]
}
