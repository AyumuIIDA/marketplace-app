package reviewsapp

import (
	"bytes"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"

	reviewsdomain "github.com/outarc/marketplace/api-go/internal/modules/reviews/domain"
	"github.com/outarc/marketplace/api-go/internal/shared/apperr"
)

// ReviewSignaturePayload は署名対象の正準表現（キー順固定）。
type ReviewSignaturePayload struct {
	ReviewID   string  `json:"reviewId"`
	OrderID    string  `json:"orderId"`
	ReviewerID string  `json:"reviewerId"`
	RevieweeID string  `json:"revieweeId"`
	AgentID    *string `json:"agentId"`
	Rating     int32   `json:"rating"`
	Comment    string  `json:"comment"`
}

// ComputeReviewPayloadHash はレビューの正準JSONからsha256ハッシュ(sha256:hex)を計算する。
// 既存TSと同じキー順・compact・HTMLエスケープ無しで一貫性を保つ。
func ComputeReviewPayloadHash(p ReviewSignaturePayload) (string, error) {
	var buf bytes.Buffer
	enc := json.NewEncoder(&buf)
	enc.SetEscapeHTML(false)
	if err := enc.Encode(p); err != nil {
		return "", apperr.Internal("failed to encode review payload", err)
	}
	canonical := bytes.TrimRight(buf.Bytes(), "\n")
	sum := sha256.Sum256(canonical)
	return fmt.Sprintf("sha256:%s", hex.EncodeToString(sum[:])), nil
}

// ReviewToSignaturePayload は現在のReviewから署名payloadを作る。
func ReviewToSignaturePayload(r *reviewsdomain.Review) ReviewSignaturePayload {
	var agent *string
	if r.AgentID() != nil {
		s := r.AgentID().String()
		agent = &s
	}
	return ReviewSignaturePayload{
		ReviewID:   r.ID().String(),
		OrderID:    r.OrderID().String(),
		ReviewerID: r.ReviewerID().String(),
		RevieweeID: r.RevieweeID().String(),
		AgentID:    agent,
		Rating:     r.Rating(),
		Comment:    r.Comment(),
	}
}
