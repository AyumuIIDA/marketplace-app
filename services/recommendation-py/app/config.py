"""env駆動の設定。デフォルトは設計(prj_context/recommendation-design-iayu6.md)の採用版。"""
import os
from dataclasses import dataclass


@dataclass(frozen=True)
class Config:
    # gRPC
    grpc_port: int = int(os.getenv("GRPC_PORT", "50051"))

    # CLIP（多言語 ViT-B/32, self-host, CPU）。画像/テキスト共通空間, dim=512。
    clip_model: str = os.getenv("CLIP_MODEL", "xlm-roberta-base-ViT-B-32")
    clip_pretrained: str = os.getenv("CLIP_PRETRAINED", "laion5b_s13b_b90k")
    clip_dim: int = int(os.getenv("CLIP_DIM", "512"))

    # Gemini text-embedding（Vertex, ADC=recommendation-py の SA に aiplatform.user）。
    gemini_embed_model: str = os.getenv("GEMINI_EMBED_MODEL", "text-embedding-004")
    gemini_dim: int = int(os.getenv("GEMINI_DIM", "768"))
    gcp_project: str = os.getenv("GOOGLE_CLOUD_PROJECT", "term9-ayumu-iida")
    gcp_location: str = os.getenv("GOOGLE_CLOUD_LOCATION", "us-central1")

    # Qdrant（self-host on GCE）。
    qdrant_url: str = os.getenv("QDRANT_URL", "http://127.0.0.1:6333")
    qdrant_api_key: str | None = os.getenv("QDRANT_API_KEY") or None
    collection: str = os.getenv("QDRANT_COLLECTION", "listings")

    default_top_k: int = int(os.getenv("DEFAULT_TOP_K", "24"))

    # 重み付きRRF（意味検索の融合）。Qdrant既定RRFは等価重みで、画像類似(clip)のハブ
    # （白背景アクセサリ等）が無関係クエリに侵入する。text(Gemini)を厚く・clipを薄くして抑制。
    rrf_k: int = int(os.getenv("RRF_K", "60"))
    rrf_text_weight: float = float(os.getenv("RRF_TEXT_WEIGHT", "1.0"))
    rrf_clip_weight: float = float(os.getenv("RRF_CLIP_WEIGHT", "0.3"))


CONFIG = Config()
