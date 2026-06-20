import { getTranslations } from "next-intl/server";

import { MarketplaceShell } from "../../../src/components/layout/marketplace-shell";
import { ActionButton } from "../../../src/components/ui/action-button";
import { BackLink } from "../../../src/components/ui/back-link";
import { FormField, inputClassName, textareaClassName } from "../../../src/components/ui/form-field";
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
  const { humanLabel, humanVerified, userLabel } = toShellUserLabels(currentUser);

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
      <form action={createPostAction} className="grid gap-4 border-t-2 border-ink pt-4">
        {error !== undefined && <p className="font-mono text-xs leading-5 text-seal-strong">{t("invalid")}</p>}
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
    );
  }

  return (
    <MarketplaceShell
      activeSection="catalog"
      authenticated={currentUser !== undefined}
      humanLabel={humanLabel} humanVerified={humanVerified}
      userLabel={userLabel}
    >
      <div className="mx-auto max-w-2xl">
        <BackLink href="/board" label={t("backToBoard")} />
        <div className="mt-3 border-b-2 border-ink pb-2">
          <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-seal">電子掲示板</p>
          <h1 className="text-2xl font-bold tracking-tight text-ink">{t("createTitle")}</h1>
        </div>
        <div className="mt-4">{content}</div>
      </div>
    </MarketplaceShell>
  );
}
