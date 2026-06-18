package signaturesinfra

import (
	"context"

	signaturesapp "github.com/outarc/marketplace/api-go/internal/modules/signatures/application"
	"github.com/outarc/marketplace/api-go/internal/shared/apperr"
)

// 署名/World ID が未設定の環境でも他機能の起動を妨げないためのフォールバック実装。
// 署名系ルートのみ 500(INFRASTRUCTURE_ERROR) を返す。

type unavailableSigner struct{ reason string }

func NewUnavailableSigner(reason string) signaturesapp.HumanSignatureSigner {
	return unavailableSigner{reason: reason}
}

func (s unavailableSigner) Sign(_ context.Context, _ signaturesapp.SignInput) (signaturesapp.SignOutput, error) {
	return signaturesapp.SignOutput{}, apperr.Infrastructure("human signature signer unavailable: "+s.reason, nil)
}

type unavailableVerifier struct{ reason string }

func NewUnavailableVerifier(reason string) signaturesapp.WorldIdVerifier {
	return unavailableVerifier{reason: reason}
}

func (v unavailableVerifier) Verify(_ context.Context, _ signaturesapp.IdKitResult) (signaturesapp.VerifiedWorldID, error) {
	return signaturesapp.VerifiedWorldID{}, apperr.Infrastructure("world id verifier unavailable: "+v.reason, nil)
}
