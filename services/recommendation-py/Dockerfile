# recommendation-py: CLIP(self-host) + Gemini embedding + Qdrant の gRPC サービス。
# CPU実行（GPU不要）。CLIP重みは初回ロードで取得（demoは min-instances=1 推奨）。
FROM python:3.12-slim

WORKDIR /app

# torch / torchvision は CPU wheel を同一indexから同時取得（GPU依存回避＋版整合）。
# open_clip は torchvision 依存。版不一致だと torchvision::nms エラーになるため対で固定。
RUN pip install --no-cache-dir --extra-index-url https://download.pytorch.org/whl/cpu \
    torch==2.4.1 torchvision==0.19.1

COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# CLIP重みをビルド時にキャッシュへ事前取得（実行時のHF downloadを排除＝起動を確定的に）。
ARG CLIP_MODEL=xlm-roberta-base-ViT-B-32
ARG CLIP_PRETRAINED=laion5b_s13b_b90k
RUN python -c "import open_clip; open_clip.create_model_and_transforms('${CLIP_MODEL}', pretrained='${CLIP_PRETRAINED}'); open_clip.get_tokenizer('${CLIP_MODEL}')"

# 生成スタブ + アプリ。
COPY gen ./gen
COPY app ./app

ENV PYTHONPATH=/app/gen
ENV GRPC_PORT=50051
EXPOSE 50051

CMD ["python", "-m", "app.server"]
