// Package recommendationinfra は VectorIndex port の具象（recommendation-py への gRPC client）。
package recommendationinfra

import (
	"context"
	"crypto/tls"
	"strings"

	"google.golang.org/api/idtoken"
	"google.golang.org/grpc"
	"google.golang.org/grpc/credentials"
	"google.golang.org/grpc/credentials/insecure"
	"google.golang.org/grpc/credentials/oauth"

	recommendationapp "marketplace/api-go/internal/modules/recommendation/application"
	recv1 "marketplace/api-go/internal/modules/recommendation/gen/recommendation/v1"
	"marketplace/api-go/internal/shared/apperr"
)

// GrpcVectorIndex は recommendation-py(Cloud Run, gRPC over h2/TLS) への client。
// Cloud Run は認証必須のため、サービスURLをaudienceとするID tokenを per-RPC で付与する
// （実体は API の runtime SA。recommendation サービスに run.invoker 済）。
type GrpcVectorIndex struct {
	client recv1.RecommendationServiceClient
}

// NewGrpcVectorIndex は serviceURL への接続を構築する。
//   - https://...run.app（既定/Cloud Run）: TLS＋ID token(per-RPC, audience=URL)。
//   - http://host:port（ローカル）: 平文 insecure 接続。ID token/TLSを使わずそのまま host:port へ dial。
func NewGrpcVectorIndex(ctx context.Context, serviceURL string) (*GrpcVectorIndex, error) {
	trimmed := strings.TrimRight(serviceURL, "/")

	// ローカル平文接続: recommendation-py をホスト直/composeで insecure 起動した場合。
	if strings.HasPrefix(trimmed, "http://") {
		host := strings.TrimPrefix(trimmed, "http://")
		conn, err := grpc.NewClient(host, grpc.WithTransportCredentials(insecure.NewCredentials()))
		if err != nil {
			return nil, apperr.Infrastructure("recommendation: dial", err)
		}
		return &GrpcVectorIndex{client: recv1.NewRecommendationServiceClient(conn)}, nil
	}

	// 既定(Cloud Run): TLS＋ID token。
	audience := trimmed
	host := strings.TrimPrefix(audience, "https://")
	ts, err := idtoken.NewTokenSource(ctx, audience)
	if err != nil {
		return nil, apperr.Infrastructure("recommendation: id token source", err)
	}
	conn, err := grpc.NewClient(
		host+":443",
		grpc.WithTransportCredentials(credentials.NewTLS(&tls.Config{MinVersion: tls.VersionTLS12})),
		grpc.WithPerRPCCredentials(oauth.TokenSource{TokenSource: ts}),
	)
	if err != nil {
		return nil, apperr.Infrastructure("recommendation: dial", err)
	}
	return &GrpcVectorIndex{client: recv1.NewRecommendationServiceClient(conn)}, nil
}

func (g *GrpcVectorIndex) SearchByText(ctx context.Context, query string, topK int32, f recommendationapp.SearchFilter) ([]recommendationapp.SearchHit, error) {
	res, err := g.client.SearchByText(ctx, &recv1.SearchByTextRequest{
		Query:  query,
		TopK:   topK,
		Filter: toProtoFilter(f),
	})
	if err != nil {
		return nil, apperr.Infrastructure("recommendation: SearchByText", err)
	}
	return fromProtoHits(res.GetHits()), nil
}

func (g *GrpcVectorIndex) SimilarItems(ctx context.Context, listingID string, topK int32, f recommendationapp.SearchFilter) ([]recommendationapp.SearchHit, error) {
	res, err := g.client.SimilarItems(ctx, &recv1.SimilarItemsRequest{
		ListingId: listingID,
		TopK:      topK,
		Filter:    toProtoFilter(f),
	})
	if err != nil {
		return nil, apperr.Infrastructure("recommendation: SimilarItems", err)
	}
	return fromProtoHits(res.GetHits()), nil
}

func (g *GrpcVectorIndex) Index(ctx context.Context, in recommendationapp.IndexInput) error {
	_, err := g.client.IndexListing(ctx, &recv1.IndexListingRequest{
		ListingId:   in.ListingID,
		ImageUrl:    in.ImageURL,
		Title:       in.Title,
		Description: in.Description,
		Category:    in.Category,
		Price:       int64(in.Price),
		Status:      in.Status,
		SellerId:    in.SellerID,
	})
	if err != nil {
		return apperr.Infrastructure("recommendation: IndexListing", err)
	}
	return nil
}

func (g *GrpcVectorIndex) Delete(ctx context.Context, listingID string) error {
	if _, err := g.client.DeleteListing(ctx, &recv1.DeleteListingRequest{ListingId: listingID}); err != nil {
		return apperr.Infrastructure("recommendation: DeleteListing", err)
	}
	return nil
}

func toProtoFilter(f recommendationapp.SearchFilter) *recv1.ListingFilter {
	pf := &recv1.ListingFilter{Categories: f.Categories, ExcludeListingId: f.ExcludeListingID}
	if f.MinPrice != nil {
		v := int64(*f.MinPrice)
		pf.MinPrice = &v
	}
	if f.MaxPrice != nil {
		v := int64(*f.MaxPrice)
		pf.MaxPrice = &v
	}
	if f.Status != nil {
		s := *f.Status
		pf.Status = &s
	}
	return pf
}

func fromProtoHits(hits []*recv1.Hit) []recommendationapp.SearchHit {
	out := make([]recommendationapp.SearchHit, 0, len(hits))
	for _, h := range hits {
		out = append(out, recommendationapp.SearchHit{ListingID: h.GetListingId(), Score: h.GetScore()})
	}
	return out
}
