// 商品画像。実画像があれば cover で表示、無ければ静かな paper プレースホルダ（偽イラストは廃止）。
export function ProductVisual({ imageUrl, title }: { imageUrl?: string; title: string }) {
  if (imageUrl !== undefined) {
    return (
      // 商品画像はブラウザが storage を直接読む公開アセット
      <img
        alt={title}
        className="aspect-square w-full bg-paper object-cover"
        loading="lazy"
        src={imageUrl}
      />
    );
  }

  return (
    <div className="grid aspect-square w-full place-items-center bg-paper">
      <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-ink-faint">no photo</span>
    </div>
  );
}
