"use client";

import { useState } from "react";

import { combineClassNames } from "../../../components/ui/class-name";

type FollowStatus = { followingByMe: boolean };

type FollowButtonProps = {
  initialFollowing?: boolean;
  text: { follow: string; following: string };
  className?: string;
  toggleAction: (following: boolean) => Promise<FollowStatus>;
};

/*
  フォロー（出品者の私的フォロー）トグル。認証不要・公開カウントなし。
  「出品者いいね（公開・認証必須）」とは別の私的アクション。楽観的更新→server action確定。
*/
export function FollowButton({ className, initialFollowing = false, text, toggleAction }: FollowButtonProps) {
  const [following, setFollowing] = useState(initialFollowing);
  const [pending, setPending] = useState(false);

  async function toggle() {
    if (pending) {
      return;
    }
    const next = !following;
    setFollowing(next);
    setPending(true);
    try {
      const status = await toggleAction(next);
      setFollowing(status.followingByMe);
    } catch {
      setFollowing(!next);
    } finally {
      setPending(false);
    }
  }

  return (
    <button
      aria-pressed={following}
      className={combineClassNames(
        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-semibold transition-colors",
        following ? "border-line-strong bg-paper text-ink" : "border-ink bg-ink text-paper hover:bg-ink/90",
        className,
      )}
      disabled={pending}
      onClick={toggle}
      type="button"
    >
      {following ? text.following : text.follow}
    </button>
  );
}
