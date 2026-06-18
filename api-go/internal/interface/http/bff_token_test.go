package httpinterface

import (
	"crypto/ed25519"
	"crypto/rand"
	"encoding/base64"
	"encoding/json"
	"testing"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

func newTestVerifier(t *testing.T) (*BFFTokenVerifier, ed25519.PrivateKey) {
	t.Helper()
	pub, priv, err := ed25519.GenerateKey(rand.Reader)
	if err != nil {
		t.Fatalf("genkey: %v", err)
	}
	jwk, err := json.Marshal(ed25519JWK{
		Kty: "OKP",
		Crv: "Ed25519",
		X:   base64.RawURLEncoding.EncodeToString(pub),
	})
	if err != nil {
		t.Fatalf("marshal jwk: %v", err)
	}
	v, err := NewBFFTokenVerifier(string(jwk))
	if err != nil {
		t.Fatalf("new verifier: %v", err)
	}
	return v, priv
}

func sign(t *testing.T, priv ed25519.PrivateKey, claims jwt.MapClaims) string {
	t.Helper()
	tok := jwt.NewWithClaims(jwt.SigningMethodEdDSA, claims)
	s, err := tok.SignedString(priv)
	if err != nil {
		t.Fatalf("sign: %v", err)
	}
	return s
}

func TestBFFTokenVerifier_ValidToken(t *testing.T) {
	v, priv := newTestVerifier(t)
	token := sign(t, priv, jwt.MapClaims{
		"iss": bffIssuer,
		"aud": bffAudience,
		"sub": "e164203c-9eb0-4bd1-a1fc-b6fd578f7d6a",
		"sid": "session-1",
		"exp": time.Now().Add(time.Hour).Unix(),
	})

	cu, err := v.Verify(token)
	if err != nil {
		t.Fatalf("verify: %v", err)
	}
	if cu.UserID != "e164203c-9eb0-4bd1-a1fc-b6fd578f7d6a" {
		t.Errorf("userID = %q", cu.UserID)
	}
	if cu.SessionID != "session-1" {
		t.Errorf("sessionID = %q", cu.SessionID)
	}
}

func TestBFFTokenVerifier_RejectsWrongIssuer(t *testing.T) {
	v, priv := newTestVerifier(t)
	token := sign(t, priv, jwt.MapClaims{
		"iss": "evil",
		"aud": bffAudience,
		"sub": "u1",
		"exp": time.Now().Add(time.Hour).Unix(),
	})
	if _, err := v.Verify(token); err == nil {
		t.Fatal("expected rejection for wrong issuer")
	}
}

func TestBFFTokenVerifier_RejectsWrongAudience(t *testing.T) {
	v, priv := newTestVerifier(t)
	token := sign(t, priv, jwt.MapClaims{
		"iss": bffIssuer,
		"aud": "other-api",
		"sub": "u1",
		"exp": time.Now().Add(time.Hour).Unix(),
	})
	if _, err := v.Verify(token); err == nil {
		t.Fatal("expected rejection for wrong audience")
	}
}

func TestBFFTokenVerifier_RejectsForeignKey(t *testing.T) {
	v, _ := newTestVerifier(t)
	_, otherPriv, _ := ed25519.GenerateKey(rand.Reader)
	token := sign(t, otherPriv, jwt.MapClaims{
		"iss": bffIssuer,
		"aud": bffAudience,
		"sub": "u1",
		"exp": time.Now().Add(time.Hour).Unix(),
	})
	if _, err := v.Verify(token); err == nil {
		t.Fatal("expected rejection for token signed by a different key")
	}
}

func TestBFFTokenVerifier_RejectsMissingSubject(t *testing.T) {
	v, priv := newTestVerifier(t)
	token := sign(t, priv, jwt.MapClaims{
		"iss": bffIssuer,
		"aud": bffAudience,
		"exp": time.Now().Add(time.Hour).Unix(),
	})
	if _, err := v.Verify(token); err == nil {
		t.Fatal("expected rejection for missing subject")
	}
}
