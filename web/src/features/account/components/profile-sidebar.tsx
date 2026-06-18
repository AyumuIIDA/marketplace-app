import { getTranslations } from "next-intl/server";

import { ActionButton } from "../../../components/ui/action-button";
import { Avatar } from "../../../components/ui/avatar";
import { FormField, inputClassName } from "../../../components/ui/form-field";
import { Seal } from "../../../components/ui/seal";
import { StatusBadge } from "../../../components/ui/status-badge";
import type { CurrentUser } from "../../../lib/api/current-user.api";
import { WorldIdButton } from "../../world-id/components/world-id-button";
import { updateDisplayNameAction } from "../actions";

type ProfileSidebarProps = {
  currentUser: CurrentUser;
  listingsCount: number;
  purchasesCount: number;
};

// GitHub profile 型の左サイドバー。本人＝朱印で示し、stats と編集導線を一箇所に集約する。
export async function ProfileSidebar({ currentUser, listingsCount, purchasesCount }: ProfileSidebarProps) {
  const t = await getTranslations("pages.me");

  return (
    <aside className="lg:sticky lg:top-20">
      <div className="flex items-center gap-4 lg:flex-col lg:items-start lg:gap-4">
        <Avatar
          alt=""
          className="size-16 lg:size-32"
          seed={currentUser.displayName}
          src={currentUser.avatarUrl}
        />
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="truncate text-xl font-bold tracking-tight text-ink">{currentUser.displayName}</h1>
            {currentUser.humanVerified && <Seal label={t("worldIdLinked")} size="sm" />}
          </div>
          {currentUser.email !== undefined && (
            <p className="mt-0.5 truncate font-mono text-xs text-ink-faint">{currentUser.email}</p>
          )}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <StatusBadge tone={currentUser.status === "ACTIVE" ? "good" : "warn"}>{currentUser.status}</StatusBadge>
        <StatusBadge tone={currentUser.humanVerified ? "seal" : "warn"}>
          {currentUser.humanVerified ? t("worldIdLinked") : t("worldIdUnlinked")}
        </StatusBadge>
      </div>

      <dl className="mt-4 flex gap-5 border-t border-line pt-4">
        <div className="flex items-baseline gap-1.5">
          <dt className="order-2 text-xs text-ink-soft">{t("statListings")}</dt>
          <dd className="order-1 font-mono text-base font-bold text-ink">{listingsCount}</dd>
        </div>
        <div className="flex items-baseline gap-1.5">
          <dt className="order-2 text-xs text-ink-soft">{t("statPurchases")}</dt>
          <dd className="order-1 font-mono text-base font-bold text-ink">{purchasesCount}</dd>
        </div>
      </dl>

      <form action={updateDisplayNameAction} className="mt-4 space-y-2 border-t border-line pt-4">
        <input name="redirectTo" type="hidden" value="/me" />
        <FormField label={t("editName")}>
          <input className={inputClassName} defaultValue={currentUser.displayName} maxLength={50} name="displayName" required />
        </FormField>
        <ActionButton className="w-full" type="submit" variant="secondary">
          {t("save")}
        </ActionButton>
      </form>

      {!currentUser.humanVerified && (
        <div className="mt-3">
          <WorldIdButton action="account-link" label={t("linkWorldId")} />
        </div>
      )}
    </aside>
  );
}
