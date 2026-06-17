import type { ProductVisualKind } from "../listing-view-model";

export function ProductVisual({ object, imageUrl }: { object: ProductVisualKind; imageUrl?: string }) {
  if (imageUrl !== undefined) {
    return (
      <div className="my-3 aspect-square flex-1 overflow-hidden rounded-[20px] bg-white">
        {/* 商品画像はブラウザが storage を直接読む公開アセット */}
        <img alt="" className="size-full object-cover" loading="lazy" src={imageUrl} />
      </div>
    );
  }

  return (
    <div className="grid flex-1 place-items-center py-5">
      {object === "camera" && (
        <div className="relative h-24 w-32 rounded-[24px] bg-neutral-950 shadow-2xl">
          <div className="absolute left-5 top-4 h-5 w-10 rounded-full bg-white/18" />
          <div className="absolute left-1/2 top-1/2 size-14 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white p-2">
            <div className="size-full rounded-full bg-neutral-900" />
          </div>
        </div>
      )}
      {object === "keyboard" && (
        <div className="grid h-28 w-36 rotate-[-4deg] grid-cols-4 gap-1 rounded-[22px] bg-neutral-950 p-3 shadow-2xl">
          {Array.from({ length: 16 }).map((_, index) => (
            <div className="rounded-md bg-white/22" key={index} />
          ))}
        </div>
      )}
      {object === "monitor" && (
        <div className="relative h-28 w-36 rounded-[18px] bg-neutral-950 p-2 shadow-2xl">
          <div className="h-full rounded-[12px] bg-[linear-gradient(135deg,#7cb8ff,#f5dd9d,#8ad4a6)]" />
          <div className="absolute -bottom-5 left-1/2 h-5 w-12 -translate-x-1/2 rounded-b-xl bg-neutral-900" />
        </div>
      )}
      {object === "watch" && (
        <div className="relative size-28 rounded-full bg-neutral-950 p-4 shadow-2xl">
          <div className="size-full rounded-full bg-[conic-gradient(from_180deg,#9ad4ff,#ffffff,#ffc3d0,#9ad4ff)]" />
          <div className="absolute -top-6 left-1/2 h-8 w-8 -translate-x-1/2 rounded-full bg-neutral-900" />
          <div className="absolute -bottom-6 left-1/2 h-8 w-8 -translate-x-1/2 rounded-full bg-neutral-900" />
        </div>
      )}
      {object === "speaker" && (
        <div className="grid h-32 w-24 place-items-center rounded-[28px] bg-neutral-950 shadow-2xl">
          <div className="size-14 rounded-full border-[10px] border-white/22 bg-white/8" />
          <div className="size-3 rounded-full bg-white/30" />
        </div>
      )}
      {object === "lamp" && (
        <div className="relative h-32 w-28">
          <div className="absolute left-12 top-8 h-20 w-2 rotate-12 rounded-full bg-neutral-950" />
          <div className="absolute left-4 top-2 h-12 w-20 -rotate-12 rounded-[22px] bg-neutral-950 shadow-2xl" />
          <div className="absolute bottom-0 left-6 h-4 w-20 rounded-full bg-neutral-950" />
        </div>
      )}
    </div>
  );
}
