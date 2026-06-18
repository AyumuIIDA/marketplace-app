// Package clock は時刻取得を抽象化する。Application/Domainはtime.Nowを直接呼ばずClockに依存する。
package clock

import "time"

// Clock は現在時刻のport。テストでは固定時刻に差し替えられる。
type Clock interface {
	Now() time.Time
}

// SystemClock は本番用。UTCで現在時刻を返す。
type SystemClock struct{}

func NewSystemClock() SystemClock { return SystemClock{} }

func (SystemClock) Now() time.Time { return time.Now().UTC() }
