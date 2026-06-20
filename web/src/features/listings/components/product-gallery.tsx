"use client";

import { useRef, useState } from "react";

import { Seal } from "../../../components/ui/seal";

type ProductGalleryProps = {
  images: { url: string; sortOrder: number }[];
  title: string;
  signed: boolean;
  signedLabel: string;
  soldLabel?: string;
};

/*
  ZOZO型の商品ギャラリー。PCはメインビュー＋サムネイル列、モバイルは横スワイプ＋ドット。
  両モードを単一の scroll-snap トラックで同期する（サムネ/ドット/矢印すべて activeIndex を共有）。
  署名済みは左上に朱の印、SOLD は全面オーバーレイ。画像は storage 直読の公開アセット。
*/
export function ProductGallery({ images, signed, signedLabel, soldLabel, title }: ProductGalleryProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const multiple = images.length > 1;

  function onScroll() {
    const track = trackRef.current;
    if (track === null) {
      return;
    }
    setActive(Math.round(track.scrollLeft / track.clientWidth));
  }

  function scrollTo(index: number) {
    const track = trackRef.current;
    if (track === null) {
      return;
    }
    track.scrollTo({ left: index * track.clientWidth, behavior: "smooth" });
  }

  return (
    <div className="space-y-3">
      <div className="group relative aspect-[4/5] w-full overflow-hidden rounded-lg border border-line bg-paper">
        {images.length === 0 ? (
          <div className="grid size-full place-items-center">
            <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-ink-faint">NO IMAGE</span>
          </div>
        ) : (
          <div
            className="flex size-full snap-x snap-mandatory overflow-x-auto scroll-smooth [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            onScroll={onScroll}
            ref={trackRef}
          >
            {images.map((image, index) => (
              <div className="size-full shrink-0 snap-center" key={image.sortOrder}>
                {/* 全体表示。contain で枠内に収め、縦長は左右・横長は上下に紙地の余白が出る（中央寄せは contain が担う）。 */}
                <img
                  alt={index === 0 ? title : ""}
                  className="block size-full object-contain"
                  loading={index === 0 ? "eager" : "lazy"}
                  src={image.url}
                />
              </div>
            ))}
          </div>
        )}

        {signed && (
          <span className="absolute left-3 top-3">
            <Seal label={signedLabel} size="sm" />
          </span>
        )}

        {soldLabel !== undefined && (
          <span className="absolute inset-0 grid place-items-center bg-ink/55 text-base font-semibold tracking-wide text-paper">
            {soldLabel}
          </span>
        )}

        {multiple && (
          <>
            {/* ホバー時の左右送り（PC）。タッチ環境はスワイプで操作する。 */}
            <button
              aria-label="previous photo"
              className="absolute left-2 top-1/2 hidden -translate-y-1/2 place-items-center rounded-full bg-surface/85 p-1.5 text-ink shadow-sm ring-1 ring-line backdrop-blur transition-opacity hover:bg-surface focus-visible:grid focus-visible:opacity-100 disabled:opacity-0 md:grid md:opacity-0 md:group-hover:opacity-100"
              disabled={active === 0}
              onClick={() => scrollTo(active - 1)}
              type="button"
            >
              <Chevron className="size-4 rotate-180" />
            </button>
            <button
              aria-label="next photo"
              className="absolute right-2 top-1/2 hidden -translate-y-1/2 place-items-center rounded-full bg-surface/85 p-1.5 text-ink shadow-sm ring-1 ring-line backdrop-blur transition-opacity hover:bg-surface focus-visible:grid focus-visible:opacity-100 disabled:opacity-0 md:grid md:opacity-0 md:group-hover:opacity-100"
              disabled={active === images.length - 1}
              onClick={() => scrollTo(active + 1)}
              type="button"
            >
              <Chevron className="size-4" />
            </button>

            {/* モバイルのドット（PCはサムネイル列で位置を示すため隠す）。 */}
            <div className="pointer-events-none absolute inset-x-0 bottom-3 flex justify-center gap-1.5 lg:hidden">
              {images.map((image, index) => (
                <span
                  className={`size-1.5 rounded-full transition-colors ${
                    index === active ? "bg-paper shadow-sm" : "bg-paper/55"
                  }`}
                  key={image.sortOrder}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {/* サムネイル列（PCのみ）。クリックでメインビューを送る。 */}
      {multiple && (
        <div className="hidden gap-2 lg:flex">
          {images.map((image, index) => (
            <button
              aria-current={index === active}
              aria-label={`photo ${index + 1}`}
              className={`size-16 shrink-0 overflow-hidden rounded-md border transition-colors ${
                index === active ? "border-ink" : "border-line hover:border-line-strong"
              }`}
              key={image.sortOrder}
              onClick={() => scrollTo(index)}
              type="button"
            >
              <img alt="" className="size-full object-cover" loading="lazy" src={image.url} />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function Chevron({ className }: { className?: string }) {
  return (
    <svg aria-hidden className={className} fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
      <path d="m9 6 6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
