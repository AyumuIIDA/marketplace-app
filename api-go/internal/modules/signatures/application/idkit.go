// Package signaturesapp はWorld ID検証とHuman Signatureの2フェーズ手続きを実装する。
package signaturesapp

import "encoding/json"

// IdKitProofResponse はIDKit proofの1レスポンス（必要フィールドのみ）。
type IdKitProofResponse struct {
	Identifier *string `json:"identifier"`
	SignalHash *string `json:"signal_hash"`
	Nullifier  *string `json:"nullifier"`
}

// IdKitResult はフロントのIDKitから受け取る検証材料。
// World IDへはそのまま転送するため元のJSON(raw)を保持しつつ、判定に使う一部を解析する。
type IdKitResult struct {
	raw         json.RawMessage
	Action      *string
	Environment *string
	Responses   []IdKitProofResponse
}

func (r *IdKitResult) UnmarshalJSON(b []byte) error {
	r.raw = append([]byte(nil), b...)
	var s struct {
		Action      *string              `json:"action"`
		Environment *string              `json:"environment"`
		Responses   []IdKitProofResponse `json:"responses"`
	}
	if err := json.Unmarshal(b, &s); err != nil {
		return err
	}
	r.Action = s.Action
	r.Environment = s.Environment
	r.Responses = s.Responses
	return nil
}

// Raw はWorld ID Verify APIへ転送する元のJSONを返す。
func (r IdKitResult) Raw() json.RawMessage {
	if len(r.raw) == 0 {
		return json.RawMessage("{}")
	}
	return r.raw
}

// FirstResponse は最初のIDKit proofレスポンスを返す（無ければnil）。
func (r IdKitResult) FirstResponse() *IdKitProofResponse {
	if len(r.Responses) == 0 {
		return nil
	}
	return &r.Responses[0]
}
