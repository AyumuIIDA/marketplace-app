package httpinterface

import (
	"encoding/json"
	"io"
	"net/http"
	"reflect"
	"strings"

	"github.com/go-playground/validator/v10"

	"marketplace/api-go/internal/shared/apperr"
)

var validate = newValidator()

func newValidator() *validator.Validate {
	v := validator.New(validator.WithRequiredStructEnabled())
	// 検証エラーのfield名をjsonタグ（camelCase）にして、フロントの項目名と一致させる。
	v.RegisterTagNameFunc(func(fld reflect.StructField) string {
		name := strings.SplitN(fld.Tag.Get("json"), ",", 2)[0]
		if name == "-" {
			return ""
		}
		return name
	})
	return v
}

// maxJSONBytes はJSON bodyの受け入れ上限（1MB）。巨大bodyによるメモリ枯渇を防ぐ。
const maxJSONBytes = 1 << 20

// DecodeJSON はリクエストbodyをdstへdecodeし、struct tagで検証する。
// 未知キーは無視する（Zodのstrip相当）。bodyはmaxJSONBytesで上限。失敗はValidationエラー。
func DecodeJSON(r *http.Request, dst any) error {
	if r.Body == nil {
		return apperr.Validation("Request body is required.")
	}
	limited := http.MaxBytesReader(nil, r.Body, maxJSONBytes)
	if err := json.NewDecoder(limited).Decode(dst); err != nil {
		return apperr.Validation("Request body is not valid JSON.")
	}
	if err := validate.Struct(dst); err != nil {
		return validationError(err)
	}
	return nil
}

// DecodeJSONLenient はbodyをdecodeするが検証はしない。空bodyは許容（ゼロ値のまま）。
// 任意フィールドのみのリクエスト（例: {confirmed?:bool}）に使う。bodyはmaxJSONBytesで上限。
func DecodeJSONLenient(r *http.Request, dst any) error {
	if r.Body == nil {
		return nil
	}
	limited := http.MaxBytesReader(nil, r.Body, maxJSONBytes)
	if err := json.NewDecoder(limited).Decode(dst); err != nil {
		if err == io.EOF {
			return nil
		}
		return apperr.Validation("Request body is not valid JSON.")
	}
	return nil
}

func validationError(err error) error {
	var verrs validator.ValidationErrors
	if !asValidationErrors(err, &verrs) {
		return apperr.Validation("Request validation failed.")
	}
	details := make([]apperr.FieldError, 0, len(verrs))
	for _, fe := range verrs {
		details = append(details, apperr.FieldError{Field: fe.Field(), Reason: fe.Tag()})
	}
	return apperr.Validation("Request validation failed.", details...)
}

func asValidationErrors(err error, target *validator.ValidationErrors) bool {
	if v, ok := err.(validator.ValidationErrors); ok {
		*target = v
		return true
	}
	return false
}
