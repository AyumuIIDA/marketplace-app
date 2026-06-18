"""Qdrant アクセス。1 point = listing。名前付き2ベクトル(clip_image / text)を持つ。
検索は Query API の prefetch + RRF 融合で両ベクトルを統合する。
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
        """両ベクトルで近傍を取り、RRFで融合。"""
        flt = self._filter(f)
        res = self.client.query_points(
            collection_name=self.collection,
            prefetch=[
                models.Prefetch(query=clip_vec, using="clip_image", limit=top_k * 4, filter=flt),
                models.Prefetch(query=text_vec, using="text", limit=top_k * 4, filter=flt),
            ],
            query=models.FusionQuery(fusion=models.Fusion.RRF),
            limit=top_k,
            with_payload=False,
        )
        return [(str(p.id), float(p.score)) for p in res.points]

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
