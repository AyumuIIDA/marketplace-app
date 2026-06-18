import { getTranslations } from "next-intl/server";

import { MarketplaceShell } from "../../src/components/layout/marketplace-shell";
import { PageHeader } from "../../src/components/layout/page-header";
import { Avatar } from "../../src/components/ui/avatar";
import { GlassPanel } from "../../src/components/ui/glass-panel";
import { StatePanel } from "../../src/components/ui/state-panel";
import { toShellUserLabels } from "../../src/features/current-user/shell-user";
import { getCurrentUser } from "../../src/lib/api/current-user.api";
import { listInbox } from "../../src/lib/api/dm.api";
import { getSellerSummary } from "../../src/lib/api/sellers.api";
import { ensureOnboarded } from "../../src/lib/auth/onboarding";

export const dynamic = "force-dynamic";

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("ja-JP", { dateStyle: "short", timeStyle: "short" }).format(new Date(value));
}

export default async function MessagesPage() {
  await ensureOnboarded("/messages");
  const [currentUser, inbox, t] = await Promise.all([getCurrentUser(), listInbox(), getTranslations("dm")]);
  const { humanLabel, userLabel } = toShellUserLabels(currentUser);

  if (currentUser === undefined) {
    return (
      <MarketplaceShell activeSection="me" authenticated={false} humanLabel={humanLabel} userLabel={userLabel}>
        <PageHeader title={t("title")} />
        <StatePanel actionHref="/signin" actionLabel={t("signInAction")} title={t("signInTitle")}>
          {t("signInBody")}
        </StatePanel>
      </MarketplaceShell>
    );
  }

  const peers = await Promise.all(inbox.map((item) => getSellerSummary(item.peerId)));

  return (
    <MarketplaceShell activeSection="me" authenticated humanLabel={humanLabel} userLabel={userLabel}>
      <PageHeader title={t("title")} />
      {inbox.length === 0 ? (
        <StatePanel title={t("inboxEmptyTitle")}>{t("inboxEmptyBody")}</StatePanel>
      ) : (
        <div className="grid gap-2">
          {inbox.map((item, i) => {
            const peer = peers[i];
            const prefix = item.lastSenderId === currentUser.userId ? `${t("you")}: ` : "";
            return (
              <a
                className="flex items-center gap-3 rounded-lg border border-line bg-surface p-3 transition-colors hover:border-ink/30"
                href={`/messages/${item.peerId}`}
                key={item.peerId}
              >
                <Avatar alt="" className="size-11" seed={peer.displayName || peer.handle} src={peer.avatarUrl} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-sm font-semibold text-ink">{peer.displayName}</span>
                    <span className="shrink-0 font-mono text-[11px] text-ink-faint">{formatDate(item.createdAt)}</span>
                  </div>
                  <p className="mt-0.5 truncate text-xs text-ink-soft">
                    {prefix}
                    {item.body}
                  </p>
                </div>
                {item.unread > 0 && (
                  <span className="grid size-5 shrink-0 place-items-center rounded-full bg-seal text-[11px] font-semibold text-paper">
                    {item.unread}
                  </span>
                )}
              </a>
            );
          })}
        </div>
      )}
    </MarketplaceShell>
  );
}
