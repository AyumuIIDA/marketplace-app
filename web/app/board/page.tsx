import { getTranslations } from "next-intl/server";

import { MarketplaceShell } from "../../src/components/layout/marketplace-shell";
import { ActionButton } from "../../src/components/ui/action-button";
import { StatePanel } from "../../src/components/ui/state-panel";
import { PostMeta } from "../../src/features/board/components/post-meta";
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
  const { humanLabel, humanVerified, userLabel } = toShellUserLabels(currentUser);

  return (
    <MarketplaceShell
      activeSection="catalog"
      authenticated={currentUser !== undefined}
      humanLabel={humanLabel} humanVerified={humanVerified}
      userLabel={userLabel}
    >
      <div className="mx-auto max-w-2xl">
        {/* テキストボードの題字。重い罫線とモノの肩見出しで掲示板らしさを出す。 */}
        <div className="flex items-end justify-between gap-3 border-b-2 border-ink pb-2">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-seal">電子掲示板</p>
            <h1 className="text-2xl font-bold tracking-tight text-ink">{t("title")}</h1>
          </div>
          <ActionButton href="/board/new" variant="primary">
            {t("newPost")}
          </ActionButton>
        </div>

        {posts.length === 0 ? (
          <div className="mt-4">
            <StatePanel actionHref="/board/new" actionLabel={t("newPost")} title={t("emptyTitle")}>
              {t("emptyBody")}
            </StatePanel>
          </div>
        ) : (
          <ol className="divide-y divide-line border-b border-line">
            {posts.map((post, index) => (
              <li key={post.postId}>
                <a className="group block px-1 py-3 transition-colors hover:bg-seal-tint/40" href={`/board/${post.postId}`}>
                  <div className="flex items-baseline gap-3">
                    <span className="shrink-0 font-mono text-sm font-bold tabular-nums text-seal">
                      {String(index + 1).padStart(3, "0")}
                    </span>
                    <h2 className="min-w-0 flex-1 truncate text-[15px] font-semibold text-ink underline-offset-2 group-hover:text-seal-strong group-hover:underline">
                      {post.title}
                    </h2>
                    <span className="shrink-0 font-mono text-xs text-ink-faint">{t("replyCount", { count: post.replyCount })}</span>
                  </div>
                  <p className="mt-1 truncate pl-9 text-sm text-ink-soft">{post.body}</p>
                  <div className="mt-1.5 pl-9">
                    <PostMeta
                      authorId={post.authorId}
                      authorName={post.authorName}
                      authorVerified={post.authorVerified}
                      date={formatDate(post.createdAt)}
                      nameLabel={t("nameLabel")}
                      verifiedLabel={t("verified")}
                    />
                  </div>
                </a>
              </li>
            ))}
          </ol>
        )}
      </div>
    </MarketplaceShell>
  );
}
