// Package signaturesinfra はWorld IDクライアント・JWS署名・repositoryを実装する。
package signaturesinfra

import (
	"context"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"strings"

	signaturesapp "marketplace/api-go/internal/modules/signatures/application"
	"marketplace/api-go/internal/shared/apperr"
)

// JwsHumanSignatureSigner はHuman SignatureをJWS(HS256, compact serialization)で署名する。
// 各backendは自分で署名・検証するため、TSとのbyte一致は不要だがJWS形式は維持する。
type JwsHumanSignatureSigner struct {
	issuer string
	secret []byte
}

func NewJwsHumanSignatureSigner(issuer, secret string) (*JwsHumanSignatureSigner, error) {
	if strings.TrimSpace(secret) == "" {
		return nil, apperr.Infrastructure("JWS secret is required.", nil)
	}
	return &JwsHumanSignatureSigner{issuer: issuer, secret: []byte(secret)}, nil
}

type jwsClaims struct {
	Iss                   string `json:"iss"`
	Sub                   string `json:"sub"`
	Jti                   string `json:"jti"`
	ActionType            string `json:"action_type"`
	ResourceType          string `json:"resource_type"`
	ResourceID            string `json:"resource_id"`
	PayloadHash           string `json:"payload_hash"`
	WorldIDVerificationID string `json:"world_id_verification_id"`
	Iat                   int64  `json:"iat"`
}

func (s *JwsHumanSignatureSigner) Sign(_ context.Context, in signaturesapp.SignInput) (signaturesapp.SignOutput, error) {
	header := base64.RawURLEncoding.EncodeToString([]byte(`{"alg":"HS256","typ":"JWT"}`))
	claimsJSON, err := json.Marshal(jwsClaims{
		Iss:                   s.issuer,
		Sub:                   in.UserID.String(),
		Jti:                   in.SignatureID.String(),
		ActionType:            string(in.ActionType),
		ResourceType:          string(in.ResourceType),
		ResourceID:            in.ResourceID.String(),
		PayloadHash:           in.PayloadHash,
		WorldIDVerificationID: in.WorldIDVerificationID.String(),
		Iat:                   in.IssuedAt.Unix(),
	})
	if err != nil {
		return signaturesapp.SignOutput{}, apperr.Infrastructure("failed to encode JWS claims", err)
	}
	payload := base64.RawURLEncoding.EncodeToString(claimsJSON)
	signingInput := fmt.Sprintf("%s.%s", header, payload)

	mac := hmac.New(sha256.New, s.secret)
	mac.Write([]byte(signingInput))
	sig := base64.RawURLEncoding.EncodeToString(mac.Sum(nil))

	return signaturesapp.SignOutput{
		SignatureValue: fmt.Sprintf("%s.%s", signingInput, sig),
		SignedAt:       in.IssuedAt,
	}, nil
}

var _ signaturesapp.HumanSignatureSigner = (*JwsHumanSignatureSigner)(nil)
