"""Qdrant アクセス。1 point = listing。名前付き2ベクトル(clip_image / text)を持つ。
検索は2ベクトルを個別取得し、重み付きRRF（text厚め）で統合する。
payload(category/price/status/seller_id) で前段フィルタ。
"""
from __future__ import annotations

from qdrant_client import QdrantClient, models

from .config import CONFIG


class VectorStore:
    def __init__(self) -> None:
        self.client = QdrantClient(url=CONFIG.qdrant_url, api_key=CONFIG.qdrant_api_key)
        self.collection = CONFIG.collection

    def ensure_collection(self) -> None:
        if self.client.collection_exists(self.collection):
            return
        self.client.create_collection(
            collection_name=self.collection,
            vectors_config={
                "clip_image": models.VectorParams(
                    size=CONFIG.clip_dim, distance=models.Distance.COSINE
                ),
                "text": models.VectorParams(
                    size=CONFIG.gemini_dim, distance=models.Distance.COSINE
                ),
            },
        )

    def upsert(
        self,
        listing_id: str,
        clip_image: list[float],
        text: list[float],
        payload: dict,
    ) -> None:
        self.client.upsert(
            collection_name=self.collection,
            points=[
                models.PointStruct(
                    id=listing_id,
                    vector={"clip_image": clip_image, "text": text},
                    payload=payload,
                )
            ],
        )

    def delete(self, listing_id: str) -> None:
        self.client.delete(
            collection_name=self.collection,
            points_selector=models.PointIdsList(points=[listing_id]),
        )

    def _filter(self, f) -> models.Filter | None:
        # f は proto の ListingFilter。空なら None。
        if f is None:
            return None
        must: list = []
        if f.categories:
            must.append(
                models.FieldCondition(
                    key="category", match=models.MatchAny(any=list(f.categories))
                )
            )
        if f.HasField("status"):
            must.append(
                models.FieldCondition(key="status", match=models.MatchValue(value=f.status))
            )
        if f.HasField("min_price") or f.HasField("max_price"):
            rng = models.Range(
                gte=f.min_price if f.HasField("min_price") else None,
                lte=f.max_price if f.HasField("max_price") else None,
            )
            must.append(models.FieldCondition(key="price", range=rng))
        must_not = []
        if f.exclude_listing_id:
            must_not.append(models.HasIdCondition(has_id=[f.exclude_listing_id]))
        if not must and not must_not:
            return None
        return models.Filter(must=must or None, must_not=must_not or None)

    def search_by_text(
        self, clip_vec: list[float], text_vec: list[float], top_k: int, f
    ) -> list[tuple[str, float]]:
        """clip_image と text を別々に検索し、重み付きRRFで融合する。
        Qdrant既定のRRFは両リスト等価重みのため、画像類似(clip)のハブ（白背景アクセサリ等）が
        無関係/多言語クエリに過剰侵入する。text(Gemini)を厚く・clipを薄く重み付けして抑制する。
        重みは env(RRF_TEXT_WEIGHT/RRF_CLIP_WEIGHT/RRF_K)で調整可。
        """
        flt = self._filter(f)
        fetch = max(top_k * 4, top_k)
        clip_hits = self.client.query_points(
            collection_name=self.collection, query=clip_vec, using="clip_image",
            query_filter=flt, limit=fetch, with_payload=False,
        ).points
        text_hits = self.client.query_points(
            collection_name=self.collection, query=text_vec, using="text",
            query_filter=flt, limit=fetch, with_payload=False,
        ).points

        k = CONFIG.rrf_k
        scores: dict[str, float] = {}
        for rank, p in enumerate(text_hits):
            pid = str(p.id)
            scores[pid] = scores.get(pid, 0.0) + CONFIG.rrf_text_weight / (k + rank + 1)
        for rank, p in enumerate(clip_hits):
            pid = str(p.id)
            scores[pid] = scores.get(pid, 0.0) + CONFIG.rrf_clip_weight / (k + rank + 1)

        ranked = sorted(scores.items(), key=lambda kv: kv[1], reverse=True)[:top_k]
        return [(pid, float(score)) for pid, score in ranked]

    def similar_by_image(self, clip_vec: list[float], top_k: int, f) -> list[tuple[str, float]]:
        res = self.client.query_points(
            collection_name=self.collection,
            query=clip_vec,
            using="clip_image",
            query_filter=self._filter(f),
            limit=top_k,
            with_payload=False,
        )
        return [(str(p.id), float(p.score)) for p in res.points]
