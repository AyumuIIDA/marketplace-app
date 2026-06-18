import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";

import { auth } from "../../auth";
import { FormField, inputClassName } from "../../src/components/ui/form-field";
import { Seal } from "../../src/components/ui/seal";
import { updateDisplayNameAction } from "../../src/features/account/actions";

export const dynamic = "force-dynamic";

type OnboardingPageProps = {
  searchParams: Promise<{ callbackUrl?: string; error?: string }>;
};

export default async function OnboardingPage({ searchParams }: OnboardingPageProps) {
  const [{ callbackUrl, error }, session, t] = await Promise.all([
    searchParams,
    auth(),
    getTranslations("onboarding"),
  ]);

  if (session?.user?.id === undefined) {
    redirect("/signin");
  }

  const redirectTo = callbackUrl ?? "/";
  const suggested = (session.user.name ?? "").trim();

  return (
    <main className="grid min-h-screen place-items-center bg-paper px-4 py-12 text-ink">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex items-center justify-center gap-2.5">
          <Seal size="md" />
          <span className="text-base font-bold tracking-tight">{t("brand")}</span>
        </div>

        <div className="rounded-lg border border-line bg-surface p-6 shadow-sm">
          <h1 className="text-xl font-bold tracking-tight">{t("title")}</h1>
          <p className="mt-1.5 text-sm leading-6 text-ink-soft">{t("subtitle")}</p>

          <form action={updateDisplayNameAction} className="mt-6 grid gap-4">
            <input name="redirectTo" type="hidden" value={redirectTo} />
            <FormField label={t("label")}>
              <input
                autoFocus
                className={inputClassName}
                defaultValue={suggested}
                maxLength={50}
                name="displayName"
                placeholder={t("placeholder")}
                required
              />
            </FormField>
            {error !== undefined && <p className="text-xs leading-5 text-seal-strong">{t("invalid")}</p>}
            <button
              className="inline-flex w-full items-center justify-center rounded-md bg-[#191c20] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-black"
              type="submit"
            >
              {t("submit")}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
