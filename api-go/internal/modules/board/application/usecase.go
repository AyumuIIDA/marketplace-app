// Package boardapp は掲示板のUseCaseを実装する。投稿/返信は人間性検証済みのみ許可する。
package boardapp

import (
	"context"

	"github.com/google/uuid"

	boarddomain "marketplace/api-go/internal/modules/board/domain"
	"marketplace/api-go/internal/shared/apperr"
	"marketplace/api-go/internal/shared/clock"
	"marketplace/api-go/internal/shared/ids"
)

const timeLayout = "2006-01-02T15:04:05.000000Z07:00"

// --- Views ---

type PostListItemView struct {
	PostID          string  `json:"postId"`
	AuthorID        string  `json:"authorId"`
	AuthorName      string  `json:"authorName"`
	AuthorAvatarURL *string `json:"authorAvatarUrl"`
	AuthorVerified  bool    `json:"authorVerified"`
	Title           string  `json:"title"`
	Body            string  `json:"body"`
	CreatedAt       string  `json:"createdAt"`
	ReplyCount      int64   `json:"replyCount"`
}

type ReplyView struct {
	ReplyID         string  `json:"replyId"`
	AuthorID        string  `json:"authorId"`
	AuthorName      string  `json:"authorName"`
	AuthorAvatarURL *string `json:"authorAvatarUrl"`
	AuthorVerified  bool    `json:"authorVerified"`
	Body            string  `json:"body"`
	CreatedAt       string  `json:"createdAt"`
}

type PostDetailView struct {
	PostID          string      `json:"postId"`
	AuthorID        string      `json:"authorId"`
	AuthorName      string      `json:"authorName"`
	AuthorAvatarURL *string     `json:"authorAvatarUrl"`
	AuthorVerified  bool        `json:"authorVerified"`
	Title           string      `json:"title"`
	Body            string      `json:"body"`
	CreatedAt       string      `json:"createdAt"`
	Replies         []ReplyView `json:"replies"`
}

func presentReply(r boarddomain.ReplyItem) ReplyView {
	return ReplyView{
		ReplyID:         r.ID.String(),
		AuthorID:        r.AuthorID.String(),
		AuthorName:      r.Author.DisplayName,
		AuthorAvatarURL: r.Author.AvatarURL,
		AuthorVerified:  r.Author.Verified,
		Body:            r.Body,
		CreatedAt:       r.CreatedAt.Format(timeLayout),
	}
}

// --- ListPosts ---

type ListPostsResult struct {
	Items []PostListItemView `json:"items"`
}

type ListPostsUseCase struct {
	repo boarddomain.Repository
}

func NewListPostsUseCase(repo boarddomain.Repository) *ListPostsUseCase {
	return &ListPostsUseCase{repo: repo}
}

func (uc *ListPostsUseCase) Execute(ctx context.Context, limit, offset int32) (ListPostsResult, error) {
	if limit <= 0 {
		limit = 50
	}
	posts, err := uc.repo.ListPosts(ctx, limit, offset)
	if err != nil {
		return ListPostsResult{}, err
	}
	items := make([]PostListItemView, 0, len(posts))
	for _, p := range posts {
		items = append(items, PostListItemView{
			PostID:          p.ID.String(),
			AuthorID:        p.AuthorID.String(),
			AuthorName:      p.Author.DisplayName,
			AuthorAvatarURL: p.Author.AvatarURL,
			AuthorVerified:  p.Author.Verified,
			Title:           p.Title,
			Body:            p.Body,
			CreatedAt:       p.CreatedAt.Format(timeLayout),
			ReplyCount:      p.ReplyCount,
		})
	}
	return ListPostsResult{Items: items}, nil
}

// --- GetPost (detail + replies) ---

type GetPostUseCase struct {
	repo boarddomain.Repository
}

func NewGetPostUseCase(repo boarddomain.Repository) *GetPostUseCase {
	return &GetPostUseCase{repo: repo}
}

func (uc *GetPostUseCase) Execute(ctx context.Context, postID uuid.UUID) (PostDetailView, error) {
	post, err := uc.repo.GetPost(ctx, postID)
	if err != nil {
		return PostDetailView{}, err
	}
	if post == nil {
		return PostDetailView{}, apperr.NotFound("BoardPost", postID.String())
	}
	replies, err := uc.repo.ListReplies(ctx, postID)
	if err != nil {
		return PostDetailView{}, err
	}
	views := make([]ReplyView, 0, len(replies))
	for _, r := range replies {
		views = append(views, presentReply(r))
	}
	return PostDetailView{
		PostID:          post.ID.String(),
		AuthorID:        post.AuthorID.String(),
		AuthorName:      post.Author.DisplayName,
		AuthorAvatarURL: post.Author.AvatarURL,
		AuthorVerified:  post.Author.Verified,
		Title:           post.Title,
		Body:            post.Body,
		CreatedAt:       post.CreatedAt.Format(timeLayout),
		Replies:         views,
	}, nil
}

// --- CreatePost (verified only) ---

type CreatePostUseCase struct {
	repo  boarddomain.Repository
	idGen ids.Generator
	clock clock.Clock
}

func NewCreatePostUseCase(repo boarddomain.Repository, g ids.Generator, c clock.Clock) *CreatePostUseCase {
	return &CreatePostUseCase{repo: repo, idGen: g, clock: c}
}

func (uc *CreatePostUseCase) Execute(ctx context.Context, authorID uuid.UUID, title, body string) (PostListItemView, error) {
	author, err := requireVerified(ctx, uc.repo, authorID)
	if err != nil {
		return PostListItemView{}, err
	}
	post, err := boarddomain.NewBoardPost(uc.idGen.NewID(), authorID, title, body, uc.clock.Now())
	if err != nil {
		return PostListItemView{}, err
	}
	if err := uc.repo.SavePost(ctx, post); err != nil {
		return PostListItemView{}, err
	}
	return PostListItemView{
		PostID:          post.ID().String(),
		AuthorID:        authorID.String(),
		AuthorName:      author.DisplayName,
		AuthorAvatarURL: author.AvatarURL,
		AuthorVerified:  author.Verified,
		Title:           post.Title(),
		Body:            post.Body(),
		CreatedAt:       post.CreatedAt().Format(timeLayout),
		ReplyCount:      0,
	}, nil
}

// --- AddReply (verified only) ---

type AddReplyUseCase struct {
	repo  boarddomain.Repository
	idGen ids.Generator
	clock clock.Clock
}

func NewAddReplyUseCase(repo boarddomain.Repository, g ids.Generator, c clock.Clock) *AddReplyUseCase {
	return &AddReplyUseCase{repo: repo, idGen: g, clock: c}
}

func (uc *AddReplyUseCase) Execute(ctx context.Context, postID, authorID uuid.UUID, body string) (ReplyView, error) {
	author, err := requireVerified(ctx, uc.repo, authorID)
	if err != nil {
		return ReplyView{}, err
	}
	post, err := uc.repo.GetPost(ctx, postID)
	if err != nil {
		return ReplyView{}, err
	}
	if post == nil {
		return ReplyView{}, apperr.NotFound("BoardPost", postID.String())
	}
	reply, err := boarddomain.NewBoardReply(uc.idGen.NewID(), postID, authorID, body, uc.clock.Now())
	if err != nil {
		return ReplyView{}, err
	}
	if err := uc.repo.SaveReply(ctx, reply); err != nil {
		return ReplyView{}, err
	}
	return ReplyView{
		ReplyID:         reply.ID().String(),
		AuthorID:        authorID.String(),
		AuthorName:      author.DisplayName,
		AuthorAvatarURL: author.AvatarURL,
		AuthorVerified:  author.Verified,
		Body:            reply.Body(),
		CreatedAt:       reply.CreatedAt().Format(timeLayout),
	}, nil
}

// requireVerified は著者の存在と人間性検証をゲートする（未検証はForbidden）。
func requireVerified(ctx context.Context, repo boarddomain.Repository, userID uuid.UUID) (*boarddomain.AuthorInfo, error) {
	author, err := repo.FindAuthor(ctx, userID)
	if err != nil {
		return nil, err
	}
	if author == nil {
		return nil, apperr.NotFound("User", userID.String())
	}
	if !author.Verified {
		return nil, apperr.Forbidden("Only human-verified users can post on the board.")
	}
	return author, nil
}
