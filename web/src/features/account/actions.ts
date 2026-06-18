"use server";

import { redirect } from "next/navigation";
import { Pool } from "pg";

import { auth } from "../../../auth";
import { requiredEnv } from "../../lib/auth/env";
import { provisionBackendUser } from "../../lib/auth/provision";

// 表示名更新用の auth DB プール（Auth.js users.name を更新）。シングルトン。
let poolSingleton: Pool | undefined;
function getPool(): Pool {
  poolSingleton ??= new Pool({ connectionString: requiredEnv("DATABASE_URL") });
  return poolSingleton;
}

// 表示名を確定する。domain user(PUT /me) と Auth.js users.name の双方を更新する。
// Auth.js name を更新することで onboarding ゲート(name 未設定判定)を抜ける。
export async function updateDisplayNameAction(formData: FormData): Promise<void> {
  const session = await auth();
  if (session?.user?.id === undefined) {
    redirect("/signin");
  }

  const displayName = String(formData.get("displayName") ?? "").trim();
  const redirectTo = String(formData.get("redirectTo") ?? "/") || "/";
  if (displayName.length === 0 || displayName.length > 50) {
    redirect(`/onboarding?error=1&callbackUrl=${encodeURIComponent(redirectTo)}`);
  }

  await provisionBackendUser({
    userId: session.user.id,
    displayName,
    email: session.user.email ?? undefined,
  });
  await getPool().query(`UPDATE users SET name = $1 WHERE id = $2`, [displayName, session.user.id]);

  redirect(redirectTo);
}
