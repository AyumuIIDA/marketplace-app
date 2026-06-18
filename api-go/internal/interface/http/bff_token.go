package httpinterface

import (
	"crypto/ed25519"
	"encoding/base64"
	"encoding/json"
	"fmt"

	"github.com/golang-jwt/jwt/v5"

	"github.com/outarc/marketplace/api-go/internal/shared/apperr"
)

const (
	bffIssuer   = "next-bff"
	bffAudience = "hono-api"
)

// BFFTokenVerifier はBFFが発行するEdDSA(Ed25519)内部JWTを検証する。
// 公開鍵のみを保持し、APIは署名(偽造)できない非対称性を保つ。
type BFFTokenVerifier struct {
	publicKey ed25519.PublicKey
	parser    *jwt.Parser
}

// NewBFFTokenVerifier はOKP/Ed25519のJWK(JSON)から検証器を構築する。
func NewBFFTokenVerifier(jwkJSON string) (*BFFTokenVerifier, error) {
	pub, err := parseEd25519JWK(jwkJSON)
	if err != nil {
		return nil, err
	}
	parser := jwt.NewParser(
		jwt.WithValidMethods([]string{"EdDSA"}),
		jwt.WithIssuer(bffIssuer),
		jwt.WithAudience(bffAudience),
	)
	return &BFFTokenVerifier{publicKey: pub, parser: parser}, nil
}

// Verify はトークンを検証し、CurrentUser（sub=userId, sid=sessionId）を返す。
func (v *BFFTokenVerifier) Verify(tokenString string) (CurrentUser, error) {
	claims := jwt.MapClaims{}
	_, err := v.parser.ParseWithClaims(tokenString, claims, func(t *jwt.Token) (any, error) {
		if _, ok := t.Method.(*jwt.SigningMethodEd25519); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", t.Header["alg"])
		}
		return v.publicKey, nil
	})
	if err != nil {
		return CurrentUser{}, apperr.Unauthorized("Internal bearer token is invalid or expired.")
	}

	sub, _ := claims["sub"].(string)
	if sub == "" {
		return CurrentUser{}, apperr.Unauthorized("Internal bearer token subject is missing.")
	}
	sid, _ := claims["sid"].(string)
	return CurrentUser{UserID: sub, SessionID: sid}, nil
}

type ed25519JWK struct {
	Kty string `json:"kty"`
	Crv string `json:"crv"`
	X   string `json:"x"`
}

func parseEd25519JWK(jwkJSON string) (ed25519.PublicKey, error) {
	var jwk ed25519JWK
	if err := json.Unmarshal([]byte(jwkJSON), &jwk); err != nil {
		return nil, fmt.Errorf("bff jwk: invalid json: %w", err)
	}
	if jwk.Kty != "OKP" || jwk.Crv != "Ed25519" {
		return nil, fmt.Errorf("bff jwk: expected OKP/Ed25519, got %s/%s", jwk.Kty, jwk.Crv)
	}
	raw, err := base64.RawURLEncoding.DecodeString(jwk.X)
	if err != nil {
		return nil, fmt.Errorf("bff jwk: invalid x: %w", err)
	}
	if len(raw) != ed25519.PublicKeySize {
		return nil, fmt.Errorf("bff jwk: x must be %d bytes, got %d", ed25519.PublicKeySize, len(raw))
	}
	return ed25519.PublicKey(raw), nil
}
