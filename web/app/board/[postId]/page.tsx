import { getTranslations } from "next-intl/server";

import { MarketplaceShell } from "../../../src/components/layout/marketplace-shell";
import { PageHeader } from "../../../src/components/layout/page-header";
import { ActionButton } from "../../../src/components/ui/action-button";
import { Avatar } from "../../../src/components/ui/avatar";
import { BackLink } from "../../../src/components/ui/back-link";
import { FormField, textareaClassName } from "../../../src/components/ui/form-field";
import { GlassPanel } from "../../../src/components/ui/glass-panel";
import { StatePanel } from "../../../src/components/ui/state-panel";
import { toShellUserLabels } from "../../../src/features/current-user/shell-user";
import { addReplyAction } from "../../../src/features/board/actions";
import { getBoardPost } from "../../../src/lib/api/board.api";
import { getCurrentUser } from "../../../src/lib/api/current-user.api";

export const dynamic = "force-dynamic";

type PostPageProps = {
  params: Promise<{ postId: string }>;
};

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("ja-JP", { dateStyle: "short", timeStyle: "short" }).format(new Date(value));
}

function authorLine(name: string, verified: boolean, avatarUrl: string | null | undefined, date: string, verifiedLabel: string) {
  return (
    <div className="flex items-center gap-2 text-xs text-ink-faint">
      <Avatar alt="" className="size-6" seed={name} src={avatarUrl ?? undefined} />
      <span className="truncate font-medium text-ink-soft">{name}</span>
      {verified && <span className="font-bold text-seal" title={verifiedLabel}>人</span>}
      <span>·</span>
      <span>{date}</span>
    </div>
  );
}

export default async function BoardPostPage({ params }: PostPageProps) {
  const { postId } = await params;
  const [currentUser, post, t] = await Promise.all([
    getCurrentUser(),
    getBoardPost(postId),
    getTranslations("board"),
  ]);
  const { humanLabel, userLabel } = toShellUserLabels(currentUser);

  if (post === undefined) {
    return (
      <MarketplaceShell
        activeSection="catalog"
        authenticated={currentUser !== undefined}
        humanLabel={humanLabel}
        userLabel={userLabel}
      >
        <StatePanel actionHref="/board" actionLabel={t("backToBoard")} title={t("unavailableTitle")}>
          {t("unavailableBody")}
        </StatePanel>
      </MarketplaceShell>
    );
  }

  const canReply = currentUser !== undefined && currentUser.humanVerified;

  return (
    <MarketplaceShell
      activeSection="catalog"
      authenticated={currentUser !== undefined}
      humanLabel={humanLabel}
      userLabel={userLabel}
    >
      <div className="mx-auto max-w-2xl space-y-4">
        <BackLink href="/board" label={t("backToBoard")} />

        <GlassPanel className="p-6">
          <h1 className="text-xl font-bold text-ink">{post.title}</h1>
          <div className="mt-2">
            {authorLine(post.authorName, post.authorVerified, post.authorAvatarUrl, formatDate(post.createdAt), t("verified"))}
          </div>
          <p className="mt-4 whitespace-pre-line text-sm leading-7 text-ink">{post.body}</p>
        </GlassPanel>

        <section className="space-y-2">
          <h2 className="px-1 text-sm font-semibold text-ink">{t("replyCount", { count: post.replies.length })}</h2>
          {post.replies.map((reply, i) => (
            <div className="rounded-lg border border-line bg-surface p-4" key={reply.replyId}>
              <div className="mb-1.5 flex items-center justify-between gap-2">
                <span className="font-mono text-xs text-ink-faint">#{i + 1}</span>
                {authorLine(reply.authorName, reply.authorVerified, reply.authorAvatarUrl, formatDate(reply.createdAt), t("verified"))}
              </div>
              <p className="whitespace-pre-line text-sm leading-6 text-ink">{reply.body}</p>
            </div>
          ))}
        </section>

        {canReply ? (
          <form action={addReplyAction.bind(null, postId)} className="grid gap-2">
            <FormField label={t("replyLabel")}>
              <textarea className={textareaClassName} name="body" placeholder={t("replyPlaceholder")} required rows={3} />
            </FormField>
            <div className="flex justify-end">
              <ActionButton type="submit" variant="primary">
                {t("reply")}
              </ActionButton>
            </div>
          </form>
        ) : (
          <p className="px-1 text-xs leading-5 text-ink-soft">
            {currentUser === undefined ? t("signInBody") : t("verifyBody")}
          </p>
        )}
      </div>
    </MarketplaceShell>
  );
}
