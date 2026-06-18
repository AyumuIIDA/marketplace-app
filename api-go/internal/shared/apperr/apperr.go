// Package apperr はプロジェクト共通のエラー分類を定義する。
// Domain/Application はこの分類だけを返し、HTTP/MCP境界で一度だけstatus/codeへ写像する。
//
// codeとstatusは既存TS実装の契約に一致させる（フロントは error.code と status で分岐する）:
//
//	DomainError       -> 400, code=各業務固有（例 "LISTING_NOT_PURCHASABLE"）
//	ValidationAppError-> 400, code="VALIDATION_FAILED"
//	NotFoundError     -> 404, code="NOT_FOUND",         message="<resource> not found: <id>"
//	AuthenticationErr -> 401, code="NOT_AUTHENTICATED"
//	AuthorizationErr  -> 403, code="NOT_AUTHORIZED"
//	InfrastructureErr -> 500, code="INFRASTRUCTURE_ERROR"
//	(未分類)           -> 500, code="INTERNAL_SERVER_ERROR"
package apperr

import (
	"errors"
	"fmt"
)

// Kind はエラーの業務的分類。HTTP status / MCP error への写像はこの分類で決まる。
type Kind int

const (
	KindInternal Kind = iota
	KindNotFound
	KindValidation
	KindDomain
	KindForbidden
	KindUnauthorized
	KindConflict
)

// FieldError は入力検証の詳細（フィールド単位）。
type FieldError struct {
	Field  string `json:"field"`
	Reason string `json:"reason"`
}

// AppError はアプリ全体で扱う単一のエラー型。
// Code は安定した機械可読コード（フロントが分岐に使う）。err は原因（%wでwrap）。
type AppError struct {
	Kind    Kind
	Code    string
	Message string
	Details []FieldError
	err     error
}

func (e *AppError) Error() string {
	if e.err != nil {
		return fmt.Sprintf("%s: %s: %v", e.Code, e.Message, e.err)
	}
	return fmt.Sprintf("%s: %s", e.Code, e.Message)
}

func (e *AppError) Unwrap() error { return e.err }

// As は err 連鎖から *AppError を取り出す。なければ false。
func As(err error) (*AppError, bool) {
	var ae *AppError
	if errors.As(err, &ae) {
		return ae, true
	}
	return nil, false
}

// IsNotFound はNotFound分類かを返す（repositoryで「不在=nil」に畳むのに使う）。
func IsNotFound(err error) bool {
	ae, ok := As(err)
	return ok && ae.Kind == KindNotFound
}

// --- constructors（TS各エラークラスに対応）---

// Domain は業務不変条件/状態遷移の違反（TS DomainError, 400）。codeは業務固有。
func Domain(code, message string, details ...FieldError) *AppError {
	return &AppError{Kind: KindDomain, Code: code, Message: message, Details: details}
}

// Validation は入力検証エラー（TS ValidationAppError, 400, code=VALIDATION_FAILED）。
func Validation(message string, details ...FieldError) *AppError {
	return &AppError{Kind: KindValidation, Code: "VALIDATION_FAILED", Message: message, Details: details}
}

// NotFound はリソース不在（TS NotFoundError, 404, code=NOT_FOUND）。
func NotFound(resource, id string) *AppError {
	return &AppError{Kind: KindNotFound, Code: "NOT_FOUND", Message: fmt.Sprintf("%s not found: %s", resource, id)}
}

// Unauthorized は未認証（TS AuthenticationError, 401, code=NOT_AUTHENTICATED）。
func Unauthorized(message string) *AppError {
	return &AppError{Kind: KindUnauthorized, Code: "NOT_AUTHENTICATED", Message: message}
}

// Forbidden は認可失敗（TS AuthorizationError, 403, code=NOT_AUTHORIZED）。
func Forbidden(message string) *AppError {
	return &AppError{Kind: KindForbidden, Code: "NOT_AUTHORIZED", Message: message}
}

// Conflict は一意制約等の競合（409）。codeは業務固有（例 "LISTING_ALREADY_ORDERED"）。
func Conflict(code, message string) *AppError {
	return &AppError{Kind: KindConflict, Code: code, Message: message}
}

// Infrastructure は基盤障害（TS InfrastructureError, 500, code=INFRASTRUCTURE_ERROR）。
func Infrastructure(message string, cause error) *AppError {
	return &AppError{Kind: KindInternal, Code: "INFRASTRUCTURE_ERROR", Message: message, err: cause}
}

// Internal は未分類の内部エラー（500, code=INTERNAL_SERVER_ERROR）。
func Internal(message string, cause error) *AppError {
	return &AppError{Kind: KindInternal, Code: "INTERNAL_SERVER_ERROR", Message: message, err: cause}
}

// Wrap は原因をwrapしつつ分類/コードを維持する。
func (e *AppError) Wrap(cause error) *AppError {
	return &AppError{Kind: e.Kind, Code: e.Code, Message: e.Message, Details: e.Details, err: cause}
}
