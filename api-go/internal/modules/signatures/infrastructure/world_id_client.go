package signaturesinfra

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"

	signaturesapp "github.com/outarc/marketplace/api-go/internal/modules/signatures/application"
	"github.com/outarc/marketplace/api-go/internal/shared/apperr"
)

const defaultWorldIDEndpoint = "https://developer.world.org"

// WorldIDVerifierClient はWorld ID Verify API (v4) に対しproofを検証する。
type WorldIDVerifierClient struct {
	rpID       string
	endpoint   string
	httpClient *http.Client
}

func NewWorldIDVerifierClient(rpID string) (*WorldIDVerifierClient, error) {
	if strings.TrimSpace(rpID) == "" {
		return nil, apperr.Infrastructure("World ID rpId is required.", nil)
	}
	return &WorldIDVerifierClient{
		rpID:       rpID,
		endpoint:   defaultWorldIDEndpoint,
		httpClient: &http.Client{Timeout: 10 * time.Second},
	}, nil
}

type worldIDVerifyResponse struct {
	Success     *bool   `json:"success"`
	Action      *string `json:"action"`
	Nullifier   *string `json:"nullifier"`
	CreatedAt   *string `json:"created_at"`
	Environment *string `json:"environment"`
	Message     *string `json:"message"`
	Results     []struct {
		Identifier *string `json:"identifier"`
		Success    *bool   `json:"success"`
		Nullifier  *string `json:"nullifier"`
		Code       *string `json:"code"`
	} `json:"results"`
}

func (c *WorldIDVerifierClient) Verify(ctx context.Context, idKit signaturesapp.IdKitResult) (signaturesapp.VerifiedWorldID, error) {
	url := fmt.Sprintf("%s/api/v4/verify/%s", strings.TrimRight(c.endpoint, "/"), c.rpID)
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, url, bytes.NewReader(idKit.Raw()))
	if err != nil {
		return signaturesapp.VerifiedWorldID{}, apperr.Infrastructure("World ID verify request build failed.", err)
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return signaturesapp.VerifiedWorldID{}, apperr.Infrastructure("World ID verify request failed.", err)
	}
	defer resp.Body.Close()

	raw, err := io.ReadAll(io.LimitReader(resp.Body, 1<<20))
	if err != nil {
		return signaturesapp.VerifiedWorldID{}, apperr.Infrastructure("World ID verify response read failed.", err)
	}
	var body worldIDVerifyResponse
	if err := json.Unmarshal(raw, &body); err != nil {
		return signaturesapp.VerifiedWorldID{}, apperr.Infrastructure("World ID verify response shape is invalid.", err)
	}

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return signaturesapp.VerifiedWorldID{}, apperr.Infrastructure("World ID verify request failed.", nil)
	}
	if body.Success == nil || !*body.Success {
		msg := "World ID verification failed."
		if body.Message != nil {
			msg = *body.Message
		}
		return signaturesapp.VerifiedWorldID{}, apperr.Domain("WORLD_ID_VERIFICATION_FAILED", msg)
	}

	first := idKit.FirstResponse()
	action, err := firstNonEmpty(body.Action, idKit.Action)
	if err != nil {
		return signaturesapp.VerifiedWorldID{}, apperr.Infrastructure("World ID action is missing.", nil)
	}
	environment, err := firstNonEmpty(body.Environment, idKit.Environment)
	if err != nil {
		return signaturesapp.VerifiedWorldID{}, apperr.Infrastructure("World ID environment is missing.", nil)
	}
	nullifier, err := firstNonEmpty(body.Nullifier, resultsNullifier(body), responseNullifier(first))
	if err != nil {
		return signaturesapp.VerifiedWorldID{}, apperr.Infrastructure("World ID nullifier is missing.", nil)
	}
	level, err := firstNonEmpty(resultsIdentifier(body), responseIdentifier(first))
	if err != nil {
		return signaturesapp.VerifiedWorldID{}, apperr.Infrastructure("World ID verification identifier is missing.", nil)
	}

	return signaturesapp.VerifiedWorldID{
		Action:            action,
		NullifierHash:     nullifier,
		VerificationLevel: level,
		SignalHash:        responseSignalHash(first),
		Environment:       environment,
		VerifiedAt:        parseCreatedAt(body.CreatedAt),
	}, nil
}

func firstNonEmpty(candidates ...*string) (string, error) {
	for _, c := range candidates {
		if c != nil && strings.TrimSpace(*c) != "" {
			return *c, nil
		}
	}
	return "", fmt.Errorf("no non-empty candidate")
}

func resultsNullifier(b worldIDVerifyResponse) *string {
	for _, r := range b.Results {
		if r.Nullifier != nil {
			return r.Nullifier
		}
	}
	return nil
}

func resultsIdentifier(b worldIDVerifyResponse) *string {
	for _, r := range b.Results {
		if r.Identifier != nil {
			return r.Identifier
		}
	}
	return nil
}

func responseNullifier(r *signaturesapp.IdKitProofResponse) *string {
	if r == nil {
		return nil
	}
	return r.Nullifier
}

func responseIdentifier(r *signaturesapp.IdKitProofResponse) *string {
	if r == nil {
		return nil
	}
	return r.Identifier
}

func responseSignalHash(r *signaturesapp.IdKitProofResponse) *string {
	if r == nil {
		return nil
	}
	return r.SignalHash
}

func parseCreatedAt(createdAt *string) time.Time {
	if createdAt == nil {
		return time.Now().UTC()
	}
	t, err := time.Parse(time.RFC3339, *createdAt)
	if err != nil {
		return time.Now().UTC()
	}
	return t.UTC()
}

var _ signaturesapp.WorldIdVerifier = (*WorldIDVerifierClient)(nil)
