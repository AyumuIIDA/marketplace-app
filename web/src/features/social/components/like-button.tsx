"use client";

import { useState } from "react";

import { combineClassNames } from "../../../components/ui/class-name";

type LikeStatus = { likeCount: number; likedByMe: boolean };

type LikeButtonProps = {
  ariaLabel: string;
  initialLiked?: boolean;
  initialCount?: number;
  showCount?: boolean;
  // テキスト付き（出品者いいね等）。未指定はアイコンのみ（カードのハート）。
  text?: { like: string; liked: string };
  className?: string;
  // いいねトグルの server action（bind 済み）。未指定ならローカル表示のみ（永続化なし）。
  toggleAction?: (liked: boolean) => Promise<LikeStatus>;
};

/*
  いいねトグル。楽観的更新 → server action で永続化 → 応答(likeCount/likedByMe)で確定。
  失敗時は元の状態へ戻す。toggleAction 未指定時は従来どおりローカル表示のみ。
*/
export function LikeButton({
  ariaLabel,
  className,
  initialCount,
  initialLiked = false,
  showCount = false,
  text,
  toggleAction,
}: LikeButtonProps) {
  const [liked, setLiked] = useState(initialLiked);
  const [count, setCount] = useState(initialCount ?? 0);
  const [pending, setPending] = useState(false);

  async function toggle(event: React.MouseEvent) {
    // カード内に重ねる場合があるため、リンク遷移を止める。
    event.preventDefault();
    event.stopPropagation();
    if (pending) {
      return;
    }
    // state更新関数は純粋に保つ。副作用(setCount)を setLiked の updater 内で呼ぶと
    // StrictModeの updater 二重実行で count が二重加算される(dev:+2)。next はハンドラ側で導出する。
    const next = !liked;
    setLiked(next);
    if (initialCount !== undefined) {
      setCount((current) => current + (next ? 1 : -1));
    }

    if (toggleAction === undefined) {
      return;
    }

    setPending(true);
    try {
      const status = await toggleAction(next);
      // サーバ確定値で上書き（他ユーザーのいいねも反映）。
      setLiked(status.likedByMe);
      if (initialCount !== undefined) {
        setCount(status.likeCount);
      }
    } catch {
      // 失敗したら楽観的更新を巻き戻す。
      setLiked(!next);
      if (initialCount !== undefined) {
        setCount((current) => current + (next ? -1 : 1));
      }
    } finally {
      setPending(false);
    }
  }

  if (text !== undefined) {
    return (
      <button
        aria-pressed={liked}
        className={combineClassNames(
          "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-semibold transition-colors",
          liked
            ? "border-seal bg-seal-tint text-seal-strong"
            : "border-line-strong bg-surface text-ink hover:bg-paper",
          className,
        )}
        disabled={pending}
        onClick={toggle}
        type="button"
      >
        <Heart className="size-4" filled={liked} />
        {liked ? text.liked : text.like}
        {showCount && <span className="font-mono text-xs">{count}</span>}
      </button>
    );
  }

  return (
    <button
      aria-label={ariaLabel}
      aria-pressed={liked}
      className={combineClassNames(
        "inline-flex items-center gap-1 rounded-full bg-surface/90 p-2 shadow-sm ring-1 ring-line backdrop-blur transition-colors hover:bg-surface",
        liked ? "text-seal" : "text-ink-soft",
        className,
      )}
      disabled={pending}
      onClick={toggle}
      type="button"
    >
      <Heart className="size-4" filled={liked} />
      {showCount && <span className="font-mono text-xs">{count}</span>}
    </button>
  );
}

function Heart({ className, filled }: { className?: string; filled: boolean }) {
  return (
    <svg
      aria-hidden
      className={className}
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth="2"
      viewBox="0 0 24 24"
    >
      <path
        d="M12 20s-7-4.35-9.3-8.4C1.2 8.7 2.6 5.6 5.8 5.6c1.9 0 3.2 1.1 4.2 2.4 1-1.3 2.3-2.4 4.2-2.4 3.2 0 4.6 3.1 3.1 6C19 15.65 12 20 12 20Z"
        strokeLinejoin="round"
      />
    </svg>
  );
}
