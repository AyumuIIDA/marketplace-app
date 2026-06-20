"""バックフィル: Cloud SQL の listings を読み、デプロイ済み recommendation サービスの
IndexListing(gRPC) を叩いて埋め込み＆Qdrant投入する薄いクライアント（torch不要）。

前提:
  - cloud-sql-proxy 起動済（DATABASE_URL で接続）
  - recommendation サービスが Cloud Run にデプロイ済（認証必須）
  - 呼び出し元は SA を impersonate して ID token を取得（owner権限）

env:
  DATABASE_URL              postgresql://postgres:***@127.0.0.1:5432/postgres
  REC_SERVICE_HOST          marketplace-recommendation-xxxx-uc.a.run.app   (https host, no scheme)
  REC_INVOKER_SA            marketplace-api-runtime@term9-ayumu-iida.iam.gserviceaccount.com
  CONCURRENCY               default 8

実行: python scripts/backfill-embeddings.py
"""
from __future__ import annotations

import os
import subprocess
import sys
import time
from concurrent.futures import ThreadPoolExecutor, as_completed

import grpc
import psycopg

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "services", "recommendation-py", "gen"))
from recommendation.v1 import recommendation_pb2 as pb  # noqa: E402
from recommendation.v1 import recommendation_pb2_grpc as pb_grpc  # noqa: E402

# ローカル: REC_INSECURE_ADDR(例 localhost:50051) を設定すると平文gRPC＋無認証で叩く。
# 本番: REC_SERVICE_HOST(https host) + REC_INVOKER_SA で Cloud Run ID token を付与する。
LOCAL_ADDR = os.getenv("REC_INSECURE_ADDR")
HOST = os.getenv("REC_SERVICE_HOST", "")
INVOKER_SA = os.getenv("REC_INVOKER_SA", "")
CONCURRENCY = int(os.getenv("CONCURRENCY", "8"))
AUDIENCE = f"https://{HOST}" if HOST else ""

_token = {"v": "", "exp": 0.0}


def id_token() -> str:
    # Cloud Run invoker 用 ID token（audience=サービスURL）。SA impersonateで取得、~40分でrefresh。
    if time.time() < _token["exp"]:
        return _token["v"]
    out = subprocess.check_output(
        [
            "gcloud", "auth", "print-identity-token",
            f"--impersonate-service-account={INVOKER_SA}",
            f"--audiences={AUDIENCE}",
        ],
        text=True,
    ).strip()
    _token["v"] = out
    _token["exp"] = time.time() + 40 * 60
    return out


def fetch_rows() -> list[dict]:
    sql = """
        SELECT l.id, l.title, l.description, l.category, l.price, l.status,
               l.seller_id, li.url
        FROM listings l
        JOIN listing_images li ON li.listing_id = l.id AND li.sort_order = 0
    """
    limit = os.getenv("LIMIT")
    if limit:
        sql += f"\n        LIMIT {int(limit)}"
    with psycopg.connect(os.environ["DATABASE_URL"]) as conn, conn.cursor() as cur:
        cur.execute(sql)
        cols = [d.name for d in cur.description]
        return [dict(zip(cols, r)) for r in cur.fetchall()]


def make_stub() -> pb_grpc.RecommendationServiceStub:
    if LOCAL_ADDR:
        return pb_grpc.RecommendationServiceStub(grpc.insecure_channel(LOCAL_ADDR))
    creds = grpc.ssl_channel_credentials()
    channel = grpc.secure_channel(f"{HOST}:443", creds)
    return pb_grpc.RecommendationServiceStub(channel)


def index_one(stub, row) -> tuple[str, bool, str]:
    req = pb.IndexListingRequest(
        listing_id=str(row["id"]),
        image_url=row["url"],
        title=row["title"] or "",
        description=row["description"] or "",
        category=row["category"] or "",
        price=int(row["price"] or 0),
        status=row["status"] or "",
        seller_id=str(row["seller_id"] or ""),
    )
    md = [] if LOCAL_ADDR else [("authorization", f"Bearer {id_token()}")]
    try:
        res = stub.IndexListing(req, metadata=md, timeout=180)  # 初回はCLIPモデルロードを吸収
        return str(row["id"]), res.indexed, res.detail
    except grpc.RpcError as e:
        return str(row["id"]), False, f"{e.code()}: {e.details()}"[:160]


def main() -> None:
    rows = fetch_rows()
    print(f"backfill: {len(rows)} listings (main image) -> {LOCAL_ADDR or HOST}", flush=True)
    stub = make_stub()
    ok = fail = 0
    with ThreadPoolExecutor(max_workers=CONCURRENCY) as ex:
        futs = [ex.submit(index_one, stub, r) for r in rows]
        for i, f in enumerate(as_completed(futs), 1):
            lid, indexed, detail = f.result()
            if indexed:
                ok += 1
            else:
                fail += 1
                if fail <= 30:
                    print(f"  FAIL {lid}: {detail}", flush=True)
            if i % 250 == 0:
                print(f"  progress {i}/{len(rows)}  ok={ok} fail={fail}", flush=True)
    print(f"DONE: ok={ok} fail={fail} total={len(rows)}", flush=True)


if __name__ == "__main__":
    main()
