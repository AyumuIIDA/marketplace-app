package signaturesapp

import "marketplace/api-go/internal/shared/apperr"

// AssertWorldIDMatchesAction は Phase 1（tx外）: action/environment の整合を確認する。
func AssertWorldIDMatchesAction(v VerifiedWorldID, expectedAction string, expectedEnv *string) error {
	if v.Action != expectedAction {
		return apperr.Domain("WORLD_ID_ACTION_MISMATCH", "World ID action does not match expected action.")
	}
	if expectedEnv != nil && v.Environment != *expectedEnv {
		return apperr.Domain("WORLD_ID_ENVIRONMENT_MISMATCH", "World ID environment does not match expected environment.")
	}
	return nil
}

// AssertSignalHashBindsPayload は Phase 2（tx内）: proofのsignal_hashが永続化直前のpayloadへ束縛されているか確認する。
func AssertSignalHashBindsPayload(actual, expected *string) error {
	if expected != nil && (actual == nil || *actual != *expected) {
		return apperr.Domain("WORLD_ID_SIGNAL_HASH_MISMATCH", "World ID signal hash does not match expected payload signal.")
	}
	return nil
}
