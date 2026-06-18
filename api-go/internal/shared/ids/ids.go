// Package ids はID生成を抽象化する。Application/Domainは具体実装ではなくGeneratorに依存する。
package ids

import "github.com/google/uuid"

// Generator はID生成のport。テストでは決定論的な実装に差し替えられる。
type Generator interface {
	NewID() uuid.UUID
}

// UUIDGenerator は本番用のランダムUUID(v4)生成器。
type UUIDGenerator struct{}

func NewUUIDGenerator() UUIDGenerator { return UUIDGenerator{} }

func (UUIDGenerator) NewID() uuid.UUID { return uuid.New() }
