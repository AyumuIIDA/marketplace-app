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
    # 多言語モデル（100+言語, 768次元）。text-embedding-004 は英語専用で日本語クエリが
    # 退化しjewelryハブへ収束したため、cross-lingual対応の -002 を既定にする（次元は同じ）。
    gemini_embed_model: str = os.getenv("GEMINI_EMBED_MODEL", "text-multilingual-embedding-002")
    gemini_dim: int = int(os.getenv("GEMINI_DIM", "768"))
    gcp_project: str = os.getenv("GOOGLE_CLOUD_PROJECT", "term9-ayumu-iida")
    gcp_location: str = os.getenv("GOOGLE_CLOUD_LOCATION", "us-central1")

    # Qdrant（self-host on GCE）。
    qdrant_url: str = os.getenv("QDRANT_URL", "http://127.0.0.1:6333")
    qdrant_api_key: str | None = os.getenv("QDRANT_API_KEY") or None
    collection: str = os.getenv("QDRANT_COLLECTION", "listings")

    default_top_k: int = int(os.getenv("DEFAULT_TOP_K", "24"))

    # 重み付きRRF（意味検索の融合）。多言語埋め込みモデル＋task_type にしたことで text 側が
    # 日本語クエリでも機能するようになり（椅子→furniture, 靴→shoes, jewelry崩壊なし）、等価重みが
    # 最良に。text(意味)＋CLIP(視覚)を等価で融合する。重みは env で再調整可能。
    rrf_k: int = int(os.getenv("RRF_K", "60"))
    rrf_text_weight: float = float(os.getenv("RRF_TEXT_WEIGHT", "1.0"))
    rrf_clip_weight: float = float(os.getenv("RRF_CLIP_WEIGHT", "1.0"))


CONFIG = Config()
