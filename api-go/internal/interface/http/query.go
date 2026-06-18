package httpinterface

import (
	"strconv"
	"strings"

	"marketplace/api-go/internal/shared/apperr"
)

// OptionalStr はトリム後に空ならnilを返すクエリ値ヘルパ。
func OptionalStr(s string) *string {
	s = strings.TrimSpace(s)
	if s == "" {
		return nil
	}
	return &s
}

// OptionalLimit は 1..100 の正整数limitを解釈する。空ならnil。
func OptionalLimit(s string) (*int32, error) {
	if strings.TrimSpace(s) == "" {
		return nil, nil
	}
	v, err := strconv.Atoi(strings.TrimSpace(s))
	if err != nil || v <= 0 || v > 100 {
		return nil, apperr.Validation("limit must be between 1 and 100.",
			apperr.FieldError{Field: "limit", Reason: "range"})
	}
	n := int32(v)
	return &n, nil
}
