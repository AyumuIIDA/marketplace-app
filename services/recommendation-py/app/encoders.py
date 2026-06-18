"""埋め込みエンコーダ。
- CLIP: 画像とクエリ文を同一空間(dim=512)へ（self-host, CPU）。
- Gemini: title+description とクエリ文を text空間(dim=768)へ（Vertex）。
クエリは両方でencodeし、Qdrant側でRRF融合する（store.search_by_text）。
"""
from __future__ import annotations

import io
from functools import lru_cache

import requests
import torch
from PIL import Image

from .config import CONFIG


class ClipEncoder:
    """open_clip。モデルは遅延ロード（プロセス起動時に1回）。"""

    def __init__(self) -> None:
        import open_clip

        self.model, _, self.preprocess = open_clip.create_model_and_transforms(
            CONFIG.clip_model, pretrained=CONFIG.clip_pretrained
        )
        self.model.eval()
        self.tokenizer = open_clip.get_tokenizer(CONFIG.clip_model)

    @torch.no_grad()
    def encode_image_url(self, url: str) -> list[float]:
        resp = requests.get(url, timeout=20)
        resp.raise_for_status()
        img = Image.open(io.BytesIO(resp.content)).convert("RGB")
        tensor = self.preprocess(img).unsqueeze(0)
        feat = self.model.encode_image(tensor)
        feat = feat / feat.norm(dim=-1, keepdim=True)
        return feat[0].tolist()

    @torch.no_grad()
    def encode_text(self, text: str) -> list[float]:
        tokens = self.tokenizer([text])
        feat = self.model.encode_text(tokens)
        feat = feat / feat.norm(dim=-1, keepdim=True)
        return feat[0].tolist()


class GeminiTextEncoder:
    """Vertex の text-embedding。長文多言語の説明文を担当。"""

    def __init__(self) -> None:
        from google import genai

        self.client = genai.Client(
            vertexai=True, project=CONFIG.gcp_project, location=CONFIG.gcp_location
        )

    def encode(self, text: str) -> list[float]:
        res = self.client.models.embed_content(
            model=CONFIG.gemini_embed_model, contents=text
        )
        return list(res.embeddings[0].values)


@lru_cache(maxsize=1)
def get_clip() -> ClipEncoder:
    return ClipEncoder()


@lru_cache(maxsize=1)
def get_gemini() -> GeminiTextEncoder:
    return GeminiTextEncoder()
