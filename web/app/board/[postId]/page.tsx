import { getTranslations } from "next-intl/server";

import { MarketplaceShell } from "../../../src/components/layout/marketplace-shell";
import { ActionButton } from "../../../src/components/ui/action-button";
import { BackLink } from "../../../src/components/ui/back-link";
import { FormField, textareaClassName } from "../../../src/components/ui/form-field";
import { StatePanel } from "../../../src/components/ui/state-panel";
import { PostBody } from "../../../src/features/board/components/post-body";
import { PostMeta } from "../../../src/features/board/components/post-meta";
import { toShellUserLabels } from "../../../src/features/current-user/shell-user";
import { addReplyAction } from "../../../src/features/board/actions";
import { getBoardPost } from "../../../src/lib/api/board.api";
import { getCurrentUser } from "../../../src/lib/api/current-user.api";

export const dynamic = "force-dynamic";

type PostPageProps = {
  params: Promise<{ postId: string }>;
};

type PostEntry = {
  index: number;
  authorId: string;
  authorName: string;
  authorVerified: boolean;
  body: string;
  createdAt: string;
};

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("ja-JP", { dateStyle: "short", timeStyle: "short" }).format(new Date(value));
}

export default async function BoardPostPage({ params }: PostPageProps) {
  const { postId } = await params;
  const [currentUser, post, t] = await Promise.all([
    getCurrentUser(),
    getBoardPost(postId),
    getTranslations("board"),
  ]);
  const { humanLabel, humanVerified, userLabel } = toShellUserLabels(currentUser);

  if (post === undefined) {
    return (
      <MarketplaceShell
        activeSection="catalog"
        authenticated={currentUser !== undefined}
        humanLabel={humanLabel} humanVerified={humanVerified}
        userLabel={userLabel}
      >
        <StatePanel actionHref="/board" actionLabel={t("backToBoard")} title={t("unavailableTitle")}>
          {t("unavailableBody")}
        </StatePanel>
      </MarketplaceShell>
    );
  }

  const canReply = currentUser !== undefined && currentUser.humanVerified;
  // OP を No.1、以降のレスを No.2.. として平坦に並べる（2ch のスレ表示）。
  const entries: PostEntry[] = [
    {
      index: 1,
      authorId: post.authorId,
      authorName: post.authorName,
      authorVerified: post.authorVerified,
      body: post.body,
      createdAt: post.createdAt,
    },
    ...post.replies.map((reply, i) => ({
      index: i + 2,
      authorId: reply.authorId,
      authorName: reply.authorName,
      authorVerified: reply.authorVerified,
      body: reply.body,
      createdAt: reply.createdAt,
    })),
  ];

  return (
    <MarketplaceShell
      activeSection="catalog"
      authenticated={currentUser !== undefined}
      humanLabel={humanLabel} humanVerified={humanVerified}
      userLabel={userLabel}
    >
      <div className="mx-auto max-w-2xl">
        <BackLink href="/board" label={t("backToBoard")} />

        <h1 className="mt-3 text-xl font-bold leading-snug tracking-tight text-ink">{post.title}</h1>
        <p className="mt-1 font-mono text-[11px] text-ink-faint">{t("replyCount", { count: post.replies.length })}</p>

        <div className="mt-2 divide-y divide-line border-t-2 border-ink">
          {entries.map((entry) => (
            <article className="scroll-mt-24 py-4" id={`p${entry.index}`} key={entry.index}>
              <PostMeta
                authorId={entry.authorId}
                authorName={entry.authorName}
                authorVerified={entry.authorVerified}
                date={formatDate(entry.createdAt)}
                index={entry.index}
                nameLabel={t("nameLabel")}
                verifiedLabel={t("verified")}
              />
              <PostBody body={entry.body} className="mt-2" />
            </article>
          ))}
        </div>

        {canReply ? (
          <form action={addReplyAction.bind(null, postId)} className="mt-4 grid gap-2 border-t-2 border-ink pt-4">
            <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-seal">{t("reply")}</p>
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
          <p className="mt-4 border-t-2 border-ink pt-4 font-mono text-[11px] leading-5 text-ink-soft">
            {currentUser === undefined ? t("signInBody") : t("verifyBody")}
          </p>
        )}
      </div>
    </MarketplaceShell>
  );
}
