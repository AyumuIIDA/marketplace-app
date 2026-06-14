import { requiredEnv } from "./env";
import { signInternalToken } from "./internal-token";

// 初回ログイン時に Hono API へ domain user を provisioning する（PUT /me は create-on-first-login）。
export async function provisionBackendUser(input: {
  userId: string;
  displayName?: string;
  email?: string;
}): Promise<void> {
  const token = await signInternalToken({ userId: input.userId });
  const displayName =
    input.displayName !== undefined && input.displayName.trim().length > 0
      ? input.displayName
      : (input.email?.split("@")[0] ?? input.userId);
  const response = await fetch(new URL("/me", requiredEnv("HONO_API_BASE_URL")), {
    method: "PUT",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      displayName,
      email: input.email ?? `${input.userId}@users.noreply.local`,
    }),
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error("Backend user provisioning failed.");
  }
}
