"use client";

import { useState } from "react";

import { Seal } from "../../../components/ui/seal";
import type { ListingComment } from "../../../lib/api/social.api";

type CommentThreadProps = {
  initialComments: ListingComment[];
  // 投稿可否。本人認証済みのログインユーザーのみ true。
  canComment: boolean;
  // 未投稿可の理由表示（未ログイン／未認証）。
  disabledReason?: string;
  // bind 済み server action: (body) => Promise<ListingComment>。
  commentAction: (body: string) => Promise<ListingComment>;
};

export function CommentThread({ canComment, commentAction, disabledReason, initialComments }: CommentThreadProps) {
  const [comments, setComments] = useState(initialComments);
  const [body, setBody] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | undefined>(undefined);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const trimmed = body.trim();
    if (trimmed.length === 0 || pending) {
      return;
    }
    setPending(true);
    setError(undefined);
    try {
      const created = await commentAction(trimmed);
      setComments((current) => [created, ...current]);
      setBody("");
    } catch {
      setError("コメントを投稿できませんでした。");
    } finally {
      setPending(false);
    }
  }

  return (
    <div>
      <h3 className="text-base font-semibold text-ink">コメント{comments.length > 0 && `（${comments.length}）`}</h3>

      {canComment ? (
        <form className="mt-3 flex items-start gap-2" onSubmit={submit}>
          <textarea
            className="min-h-[40px] flex-1 resize-y rounded-md border border-line bg-surface px-3 py-2 text-sm text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/30"
            disabled={pending}
            maxLength={1000}
            onChange={(e) => setBody(e.target.value)}
            placeholder="コメントを書く…"
            rows={1}
            value={body}
          />
          <button
            className="shrink-0 rounded-full bg-ink px-4 py-2 text-sm font-semibold text-paper transition-opacity disabled:opacity-50"
            disabled={pending || body.trim().length === 0}
            type="submit"
          >
            送信
          </button>
        </form>
      ) : (
        <p className="mt-3 text-xs text-ink-faint">{disabledReason ?? "コメントするには本人認証が必要です。"}</p>
      )}
      {error !== undefined && <p className="mt-2 text-xs text-warn">{error}</p>}

      <ul className="mt-4 space-y-3">
        {comments.length === 0 && <li className="text-sm text-ink-faint">まだコメントはありません。</li>}
        {comments.map((comment) => (
          <li className="flex gap-2.5" key={comment.commentId}>
            <span className="grid size-8 shrink-0 place-items-center rounded-full bg-paper text-xs font-semibold text-ink-soft ring-1 ring-line">
              {comment.authorDisplayName.slice(0, 2).toUpperCase()}
            </span>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="truncate text-sm font-semibold text-ink">{comment.authorDisplayName}</span>
                {comment.authorHumanVerified && <Seal label="本人認証済み" size="sm" />}
              </div>
              <p className="whitespace-pre-line break-words text-sm leading-6 text-ink-soft">{comment.body}</p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
