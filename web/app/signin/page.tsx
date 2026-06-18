import { getTranslations } from "next-intl/server";

import { signIn } from "../../auth";
import { FormField, inputClassName } from "../../src/components/ui/form-field";
import { Seal } from "../../src/components/ui/seal";

export const dynamic = "force-dynamic";

type SignInPageProps = {
  searchParams: Promise<{ mode?: string; callbackUrl?: string }>;
};

export default async function SignInPage({ searchParams }: SignInPageProps) {
  const [{ callbackUrl, mode }, t] = await Promise.all([searchParams, getTranslations()]);
  const isSignUp = mode === "signup";
  const redirectTo = callbackUrl ?? "/";

  async function signInWithProvider(formData: FormData) {
    "use server";
    await signIn(String(formData.get("provider")), { redirectTo });
  }

  async function signInWithEmail(formData: FormData) {
    "use server";
    await signIn("resend", { email: String(formData.get("email")), redirectTo });
  }

  return (
    <main className="grid min-h-screen place-items-center bg-paper px-4 py-12 text-ink">
      <div className="w-full max-w-sm">
        <a className="mb-8 flex items-center justify-center gap-2.5" href="/">
          <Seal size="md" />
          <span className="text-base font-bold tracking-tight">{t("brand.name")}</span>
        </a>

        <div className="rounded-lg border border-line bg-surface p-6 shadow-sm">
          <h1 className="text-xl font-bold tracking-tight">
            {isSignUp ? t("auth.signUpTitle") : t("auth.signInTitle")}
          </h1>
          <p className="mt-1.5 text-sm leading-6 text-ink-soft">
            {isSignUp ? t("auth.signUpSubtitle") : t("auth.signInSubtitle")}
          </p>

          <form action={signInWithProvider} className="mt-6 grid gap-2">
            <button
              className="inline-flex w-full items-center justify-center gap-2.5 rounded-md border border-line-strong bg-surface px-4 py-2.5 text-sm font-semibold text-ink transition-colors hover:bg-paper"
              name="provider"
              type="submit"
              value="google"
            >
              <GoogleIcon />
              {t("auth.google")}
            </button>
            <button
              className="inline-flex w-full items-center justify-center gap-2.5 rounded-md border border-line-strong bg-surface px-4 py-2.5 text-sm font-semibold text-ink transition-colors hover:bg-paper"
              name="provider"
              type="submit"
              value="github"
            >
              <GitHubIcon />
              {t("auth.github")}
            </button>
          </form>

          <div className="my-5 flex items-center gap-3 text-xs text-ink-faint">
            <span className="h-px flex-1 bg-line" />
            {t("auth.or")}
            <span className="h-px flex-1 bg-line" />
          </div>

          <form action={signInWithEmail} className="grid gap-3">
            <FormField label={t("auth.emailLabel")}>
              <input
                className={inputClassName}
                name="email"
                placeholder={t("auth.emailPlaceholder")}
                required
                type="email"
              />
            </FormField>
            <button
              className="inline-flex w-full items-center justify-center gap-2.5 rounded-md bg-ink px-4 py-2.5 text-sm font-semibold text-paper transition-colors hover:bg-ink/90"
              type="submit"
            >
              <MailIcon />
              {t("auth.emailSubmit")}
            </button>
          </form>

          <p className="mt-5 text-xs leading-5 text-ink-faint">{t("auth.note")}</p>
        </div>

        <p className="mt-6 text-center text-sm text-ink-soft">
          {isSignUp ? t("auth.toSignInText") : t("auth.toSignUpText")}{" "}
          <a
            className="font-semibold text-seal-strong underline-offset-2 hover:underline"
            href={isSignUp ? "/signin" : "/signin?mode=signup"}
          >
            {isSignUp ? t("auth.toSignIn") : t("auth.toSignUp")}
          </a>
        </p>
      </div>
    </main>
  );
}

// プロバイダ識別用アイコン（OAuthボタンの慣用表現）。
function GoogleIcon() {
  return (
    <svg aria-hidden className="size-[18px]" viewBox="0 0 18 18">
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62Z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.81.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 0 0 9 18Z"
      />
      <path
        fill="#FBBC05"
        d="M3.97 10.72A5.41 5.41 0 0 1 3.68 9c0-.6.1-1.18.29-1.72V4.95H.96A9 9 0 0 0 0 9c0 1.45.35 2.83.96 4.05l3.01-2.33Z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .96 4.95l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58Z"
      />
    </svg>
  );
}

function GitHubIcon() {
  return (
    <svg aria-hidden className="size-[18px]" fill="currentColor" viewBox="0 0 16 16">
      <path d="M8 0C3.58 0 0 3.58 0 8a8 8 0 0 0 5.47 7.59c.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82a7.6 7.6 0 0 1 4 0c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8Z" />
    </svg>
  );
}

function MailIcon() {
  return (
    <svg aria-hidden className="size-[18px]" fill="none" stroke="currentColor" strokeWidth="1.6" viewBox="0 0 24 24">
      <rect height="14" rx="2" width="18" x="3" y="5" />
      <path d="m4 7 8 6 8-6" strokeLinecap="round" />
    </svg>
  );
}
