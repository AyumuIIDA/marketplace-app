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
import { sendDirectMessageAction } from "../../../src/features/dm/actions";
import { getCurrentUser } from "../../../src/lib/api/current-user.api";
import { getThread, markThreadRead } from "../../../src/lib/api/dm.api";
import { getSellerSummary } from "../../../src/lib/api/sellers.api";

export const dynamic = "force-dynamic";

type ThreadPageProps = {
  params: Promise<{ userId: string }>;
};

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("ja-JP", { dateStyle: "short", timeStyle: "short" }).format(new Date(value));
}

export default async function ThreadPage({ params }: ThreadPageProps) {
  const { userId } = await params;
  const [currentUser, messages, peer, t] = await Promise.all([
    getCurrentUser(),
    getThread(userId),
    getSellerSummary(userId),
    getTranslations("dm"),
  ]);
  const { humanLabel, humanVerified, userLabel } = toShellUserLabels(currentUser);

  if (currentUser === undefined) {
    return (
      <MarketplaceShell activeSection="me" authenticated={false} humanLabel={humanLabel} humanVerified={humanVerified} userLabel={userLabel}>
        <PageHeader title={t("title")} />
        <StatePanel actionHref="/signin" actionLabel={t("signInAction")} title={t("signInTitle")}>
          {t("signInBody")}
        </StatePanel>
      </MarketplaceShell>
    );
  }

  // 表示時に相手からの未読を既読化（ベストエフォート）。
  await markThreadRead(userId);

  return (
    <MarketplaceShell activeSection="me" authenticated humanLabel={humanLabel} humanVerified={humanVerified} userLabel={userLabel}>
      <div className="mx-auto max-w-2xl space-y-4">
        <BackLink href="/messages" label={t("back")} />
        <a className="flex items-center gap-3" href={`/sellers/${userId}`}>
          <Avatar alt="" className="size-10" seed={peer.displayName || peer.handle} src={peer.avatarUrl} />
          <span className="truncate text-lg font-bold text-ink hover:underline">{peer.displayName}</span>
        </a>

        <GlassPanel className="space-y-3 p-5">
          {messages.length === 0 && <p className="text-sm text-ink-soft">{t("threadEmpty")}</p>}
          {messages.map((m) => {
            const mine = m.senderId === currentUser.userId;
            return (
              <div className={mine ? "flex justify-end" : "flex justify-start"} key={m.messageId}>
                <div
                  className={
                    mine
                      ? "max-w-[80%] rounded-2xl rounded-br-sm bg-ink px-4 py-2 text-sm text-paper"
                      : "max-w-[80%] rounded-2xl rounded-bl-sm bg-paper px-4 py-2 text-sm text-ink ring-1 ring-line"
                  }
                >
                  <p className="whitespace-pre-line leading-6">{m.body}</p>
                  <p className={mine ? "mt-1 text-right text-[10px] text-paper/70" : "mt-1 text-[10px] text-ink-faint"}>
                    {formatDate(m.createdAt)}
                  </p>
                </div>
              </div>
            );
          })}
        </GlassPanel>

        <form action={sendDirectMessageAction.bind(null, userId)} className="grid gap-2">
          <FormField label={t("messageLabel")}>
            <textarea className={textareaClassName} name="body" placeholder={t("placeholder")} required rows={2} />
          </FormField>
          <div className="flex justify-end">
            <ActionButton type="submit" variant="primary">
              {t("send")}
            </ActionButton>
          </div>
        </form>
      </div>
    </MarketplaceShell>
  );
}
