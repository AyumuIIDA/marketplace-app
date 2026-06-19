"""recommendation gRPC サーバ。契約: contracts/recommendation/v1/recommendation.proto。
5 RPC を CLIP/Gemini/Qdrant で実装。クエリは両エンコーダ→Qdrant RRF融合。
"""
from __future__ import annotations

import os
import sys
from concurrent import futures

import grpc
from grpc_health.v1 import health, health_pb2, health_pb2_grpc

# 生成スタブ（gen/recommendation/v1/*_pb2*.py）を import path に通す。
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "gen"))
from recommendation.v1 import recommendation_pb2 as pb  # noqa: E402
from recommendation.v1 import recommendation_pb2_grpc as pb_grpc  # noqa: E402

from .config import CONFIG  # noqa: E402
from .encoders import get_clip, get_gemini  # noqa: E402
from .store import VectorStore  # noqa: E402


class RecommendationServicer(pb_grpc.RecommendationServiceServicer):
    def __init__(self) -> None:
        # QdrantClient 構築のみ（ネットワーク非接続）。collection 準備は listen 開始後に行う。
        self.store = VectorStore()

    def SearchByText(self, request, context):
        top_k = request.top_k or CONFIG.default_top_k
        clip_vec = get_clip().encode_text(request.query)
        text_vec = get_gemini().encode_query(request.query)
        hits = self.store.search_by_text(
            clip_vec, text_vec, top_k, request.filter if request.HasField("filter") else None
        )
        return pb.SearchResponse(hits=[pb.Hit(listing_id=i, score=s) for i, s in hits])

    def SimilarItems(self, request, context):
        top_k = request.top_k or CONFIG.default_top_k
        # 事前計算済みベクトルでの近傍。Qdrant の recommend/lookup で self を起点にする。
        f = request.filter if request.HasField("filter") else None
        clip_vec = self.store.client.retrieve(
            collection_name=self.store.collection,
            ids=[request.listing_id],
            with_vectors=["clip_image"],
        )
        if not clip_vec:
            return pb.SearchResponse(hits=[])
        vec = clip_vec[0].vector["clip_image"]
        hits = self.store.similar_by_image(vec, top_k, f)
        hits = [(i, s) for i, s in hits if i != request.listing_id]
        return pb.SearchResponse(hits=[pb.Hit(listing_id=i, score=s) for i, s in hits])

    def IndexListing(self, request, context):
        try:
            clip_vec = get_clip().encode_image_url(request.image_url)
            text = f"{request.title}\n{request.description}".strip()
            text_vec = get_gemini().encode_document(text)
            self.store.upsert(
                request.listing_id,
                clip_vec,
                text_vec,
                payload={
                    "category": request.category,
                    "price": request.price,
                    "status": request.status,
                    "seller_id": request.seller_id,
                },
            )
            return pb.IndexListingResponse(indexed=True)
        except Exception as e:  # noqa: BLE001 — 失敗はadapter側で非ブロッキング扱い
            return pb.IndexListingResponse(indexed=False, detail=str(e)[:200])

    def DeleteListing(self, request, context):
        self.store.delete(request.listing_id)
        return pb.DeleteListingResponse(deleted=True)

    def HealthCheck(self, request, context):
        try:
            self.store.client.get_collections()
            return pb.HealthCheckResponse(ready=True, detail="ok")
        except Exception as e:  # noqa: BLE001
            return pb.HealthCheckResponse(ready=False, detail=str(e)[:200])


def serve() -> None:
    server = grpc.server(futures.ThreadPoolExecutor(max_workers=8))
    servicer = RecommendationServicer()
    pb_grpc.add_RecommendationServiceServicer_to_server(servicer, server)
    # 標準 gRPC health（Cloud Run / LB 用）。
    health_servicer = health.HealthServicer()
    health_pb2_grpc.add_HealthServicer_to_server(health_servicer, server)
    health_servicer.set("", health_pb2.HealthCheckResponse.SERVING)
    server.add_insecure_port(f"[::]:{CONFIG.grpc_port}")
    server.start()
    print(f"recommendation-py gRPC listening on :{CONFIG.grpc_port}", flush=True)
    # collection 準備は listen 開始後に best-effort。Qdrant 到達性に起動(=Cloud Run health probe)を依存させない。
    try:
        servicer.store.ensure_collection()
    except Exception as e:  # noqa: BLE001
        print(f"ensure_collection deferred (Qdrant unreachable at startup): {e}", flush=True)
    server.wait_for_termination()


if __name__ == "__main__":
    serve()
