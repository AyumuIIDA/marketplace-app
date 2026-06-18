import { getTranslations } from "next-intl/server";

import { MarketplaceShell } from "../../src/components/layout/marketplace-shell";
import { PageHeader } from "../../src/components/layout/page-header";
import { ActionButton } from "../../src/components/ui/action-button";
import { Avatar } from "../../src/components/ui/avatar";
import { StatePanel } from "../../src/components/ui/state-panel";
import { toShellUserLabels } from "../../src/features/current-user/shell-user";
import { listBoardPosts } from "../../src/lib/api/board.api";
import { getCurrentUser } from "../../src/lib/api/current-user.api";

export const dynamic = "force-dynamic";

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("ja-JP", { dateStyle: "short", timeStyle: "short" }).format(new Date(value));
}

export default async function BoardPage() {
  const [currentUser, posts, t] = await Promise.all([
    getCurrentUser(),
    listBoardPosts(),
    getTranslations("board"),
  ]);
  const { humanLabel, userLabel } = toShellUserLabels(currentUser);

  return (
    <MarketplaceShell
      activeSection="catalog"
      authenticated={currentUser !== undefined}
      humanLabel={humanLabel}
      userLabel={userLabel}
    >
      <div className="mb-4 flex items-center justify-between gap-3">
        <PageHeader title={t("title")} />
        <ActionButton href="/board/new" variant="primary">
          {t("newPost")}
        </ActionButton>
      </div>
      {posts.length === 0 ? (
        <StatePanel title={t("emptyTitle")}>{t("emptyBody")}</StatePanel>
      ) : (
        <div className="grid gap-2">
          {posts.map((post) => (
            <a
              className="rounded-lg border border-line bg-surface p-4 transition-colors hover:border-ink/30"
              href={`/board/${post.postId}`}
              key={post.postId}
            >
              <h2 className="line-clamp-1 text-base font-semibold text-ink">{post.title}</h2>
              <p className="mt-1 line-clamp-2 text-sm text-ink-soft">{post.body}</p>
              <div className="mt-3 flex items-center gap-2 text-xs text-ink-faint">
                <Avatar alt="" className="size-5" seed={post.authorName} src={post.authorAvatarUrl ?? undefined} />
                <span className="truncate font-medium text-ink-soft">{post.authorName}</span>
                {post.authorVerified && <span className="font-bold text-seal">人</span>}
                <span>·</span>
                <span>{t("replyCount", { count: post.replyCount })}</span>
                <span>·</span>
                <span>{formatDate(post.createdAt)}</span>
              </div>
            </a>
          ))}
        </div>
      )}
    </MarketplaceShell>
  );
}
