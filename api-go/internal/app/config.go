package app

import (
	"fmt"
	"os"
	"strconv"
)

// Config はCloud Run / ローカル双方で環境変数から読む。
// 秘密値はここに書かず、env（.env.api / Cloud Run secret）から注入する。
type Config struct {
	Port        string // Cloud Runは $PORT を注入する。未設定なら8080。
	DatabaseURL string // domain DB（既存 marketplace_domain と同一）

	// 認証（BFF発行の内部JWT, EdDSA公開鍵のみ。APIは検証のみで署名しない）
	BFFJWTPublicKeyJSON string // EdDSA公開鍵JWK(JSON)
	AllowDevUserHeader  bool   // dev限定: x-user-id ヘッダで current user を代替

	// Human Signature / World ID
	HumanSignatureIssuer    string
	HumanSignatureJWSSecret string
	WorldIDRPID             string

	// AI assistant（既定は鍵不要の決定論fake）
	AIAssistantProvider string
	GeminiModel         string
	GoogleCloudProject  string
	GoogleCloudLocation string
	OpenAIAPIKey        string
	OpenAIModel         string

	// 画像ストレージ（GCS / ローカルはfake-gcs-server）
	StorageBucket       string
	StorageEmulatorHost string
	PublicImageBaseURL  string
	ImageFetchBaseURL   string // AIマルチモーダル用の画像取得基底（公開URLからの書き換え先）

	// 意味検索/類似（recommendation-py への gRPC。未設定なら縮退＝空結果）
	RecommendationServiceURL string
}

// LoadConfig は環境変数からConfigを構築する。必須値が欠けるとエラーで起動を止める（fail fast）。
func LoadConfig() (Config, error) {
	cfg := Config{
		Port:        envOr("PORT", "8080"),
		DatabaseURL: os.Getenv("DATABASE_URL"),

		BFFJWTPublicKeyJSON: os.Getenv("BFF_INTERNAL_JWT_PUBLIC_KEY"),
		AllowDevUserHeader:  envBool("BFF_ALLOW_DEV_USER_HEADER", false),

		HumanSignatureIssuer:    envOr("HUMAN_SIGNATURE_ISSUER", "local-marketplace"),
		HumanSignatureJWSSecret: os.Getenv("HUMAN_SIGNATURE_JWS_SECRET"),
		WorldIDRPID:             envOr("WORLD_ID_RP_ID", "local"),

		AIAssistantProvider: envOr("AI_ASSISTANT_PROVIDER", "deterministic"),
		GeminiModel:         envOr("GEMINI_MODEL", "gemini-3.5-flash"),
		GoogleCloudProject:  os.Getenv("GOOGLE_CLOUD_PROJECT"),
		GoogleCloudLocation: envOr("GOOGLE_CLOUD_LOCATION", "global"),
		OpenAIAPIKey:        os.Getenv("OPENAI_API_KEY"),
		OpenAIModel:         os.Getenv("OPENAI_MODEL"),

		StorageBucket:       envOr("STORAGE_BUCKET", "marketplace-images"),
		StorageEmulatorHost: os.Getenv("STORAGE_EMULATOR_HOST"),
		PublicImageBaseURL:  os.Getenv("PUBLIC_IMAGE_BASE_URL"),
		ImageFetchBaseURL:   os.Getenv("IMAGE_FETCH_BASE_URL"),

		RecommendationServiceURL: os.Getenv("RECOMMENDATION_SERVICE_URL"),
	}

	if cfg.DatabaseURL == "" {
		return Config{}, fmt.Errorf("config: DATABASE_URL is required")
	}
	return cfg, nil
}

func envOr(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}

func envBool(key string, fallback bool) bool {
	v := os.Getenv(key)
	if v == "" {
		return fallback
	}
	b, err := strconv.ParseBool(v)
	if err != nil {
		return fallback
	}
	return b
}
