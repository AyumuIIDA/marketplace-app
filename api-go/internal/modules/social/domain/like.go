// Package socialdomain はいいねのドメイン不変条件を定義する。
// いいねは結合レコードのため状態は薄いが、不変条件（自己いいね禁止）はここに集約する。
package socialdomain

import (
	"github.com/google/uuid"

	"github.com/outarc/marketplace/api-go/internal/shared/apperr"
)

// EnsureCanLikeSeller は出品者いいねの不変条件を検証する。
// 自分自身を出品者としていいねすることはできない（DBの CHECK と二重防御）。
func EnsureCanLikeSeller(userID, sellerID uuid.UUID) error {
	if userID == sellerID {
		return apperr.Validation("You cannot like your own seller profile.",
			apperr.FieldError{Field: "sellerId", Reason: "self_like"})
	}
	return nil
}
