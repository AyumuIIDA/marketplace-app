#!/usr/bin/env bash
# ローカル直起動: recommendation-py(CLIP+Gemini+Qdrant gRPC) をホストのvenvで起動する。
# 前提: Qdrant が localhost:6333 で稼働（docker compose up -d qdrant）、ADC が存在すること。
# 重み(CLIP ~1.4GB)は初回ロードで HF/open_clip キャッシュ(~/.cache)へ1回だけDLされる。
set -euo pipefail
cd "$(dirname "$0")"

VENV=.venv
if [ ! -d "$VENV" ]; then
  echo "[run-local] creating venv + installing deps (torch CPU, open_clip ...)"
  python3 -m venv "$VENV"
  # shellcheck disable=SC1091
  source "$VENV/bin/activate"
  pip install --upgrade pip
  # torch/torchvision は CPU wheel を同一indexから（Dockerfileと同版で固定）。
  pip install --extra-index-url https://download.pytorch.org/whl/cpu torch==2.4.1 torchvision==0.19.1
  pip install -r requirements.txt
else
  # shellcheck disable=SC1091
  source "$VENV/bin/activate"
fi

# 生成スタブ(gen)を import パスに入れる（Dockerfile: ENV PYTHONPATH=/app/gen 相当）。
export PYTHONPATH="$(pwd)/gen"

export GRPC_PORT="${GRPC_PORT:-50051}"
export QDRANT_URL="${QDRANT_URL:-http://localhost:6333}"
export QDRANT_COLLECTION="${QDRANT_COLLECTION:-listings}"
# Gemini text-embedding(Vertex) は ADC を使う。プロジェクト/リージョンは本番defaultに合わせる。
export GOOGLE_CLOUD_PROJECT="${GOOGLE_CLOUD_PROJECT:-term9-ayumu-iida}"
export GOOGLE_CLOUD_LOCATION="${GOOGLE_CLOUD_LOCATION:-us-central1}"
export GOOGLE_APPLICATION_CREDENTIALS="${GOOGLE_APPLICATION_CREDENTIALS:-$HOME/.config/gcloud/application_default_credentials.json}"

echo "[run-local] starting gRPC server on :$GRPC_PORT (qdrant=$QDRANT_URL)"
exec python -m app.server
