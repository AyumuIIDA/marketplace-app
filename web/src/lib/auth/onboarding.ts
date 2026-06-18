import { redirect } from "next/navigation";

import { auth } from "../../../auth";

// 認証済みなのに表示名(Auth.js name)が未設定なら /onboarding へ誘導する。
// OAuthは name が埋まるため通過、magic-link 初回のみ入力を促す。匿名は素通り。
export async function ensureOnboarded(currentPath = "/"): Promise<void> {
  const session = await auth();
  if (session?.user !== undefined && (session.user.name ?? "").trim().length === 0) {
    redirect(`/onboarding?callbackUrl=${encodeURIComponent(currentPath)}`);
  }
}
