import { getTranslations } from "next-intl/server";

import { MarketplaceShell } from "../../../src/components/layout/marketplace-shell";
import { PageHeader } from "../../../src/components/layout/page-header";
import { ActionButton } from "../../../src/components/ui/action-button";
import { BackLink } from "../../../src/components/ui/back-link";
import { FormField, inputClassName, textareaClassName } from "../../../src/components/ui/form-field";
import { GlassPanel } from "../../../src/components/ui/glass-panel";
import { StatePanel } from "../../../src/components/ui/state-panel";
import { toShellUserLabels } from "../../../src/features/current-user/shell-user";
import { createPostAction } from "../../../src/features/board/actions";
import { getCurrentUser } from "../../../src/lib/api/current-user.api";

export const dynamic = "force-dynamic";

type NewPostPageProps = {
  searchParams: Promise<{ error?: string }>;
};

export default async function NewBoardPostPage({ searchParams }: NewPostPageProps) {
  const [{ error }, currentUser, t] = await Promise.all([
    searchParams,
    getCurrentUser(),
    getTranslations("board"),
  ]);
  const { humanLabel, userLabel } = toShellUserLabels(currentUser);

  let content;
  if (currentUser === undefined) {
    content = (
      <StatePanel actionHref="/signin" actionLabel={t("signInAction")} title={t("signInTitle")}>
        {t("signInBody")}
      </StatePanel>
    );
  } else if (!currentUser.humanVerified) {
    content = (
      <StatePanel actionHref="/me" actionLabel={t("verifyAction")} title={t("verifyTitle")}>
        {t("verifyBody")}
      </StatePanel>
    );
  } else {
    content = (
      <GlassPanel className="p-6">
        <form action={createPostAction} className="grid gap-4">
          {error !== undefined && <p className="text-xs leading-5 text-seal-strong">{t("invalid")}</p>}
          <FormField label={t("titleLabel")}>
            <input className={inputClassName} maxLength={120} name="title" required />
          </FormField>
          <FormField label={t("bodyLabel")}>
            <textarea className={textareaClassName} name="body" required rows={6} />
          </FormField>
          <div className="flex justify-end">
            <ActionButton type="submit" variant="primary">
              {t("post")}
            </ActionButton>
          </div>
        </form>
      </GlassPanel>
    );
  }

  return (
    <MarketplaceShell
      activeSection="catalog"
      authenticated={currentUser !== undefined}
      humanLabel={humanLabel}
      userLabel={userLabel}
    >
      <div className="mx-auto max-w-2xl space-y-4">
        <BackLink href="/board" label={t("backToBoard")} />
        <PageHeader title={t("createTitle")} />
        {content}
      </div>
    </MarketplaceShell>
  );
}
