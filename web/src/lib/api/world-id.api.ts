import type { IDKitResult } from "@worldcoin/idkit";

import { bffJson } from "./bff-client";

export async function linkWorldId(input: {
  idKitResult: IDKitResult;
  expectedEnvironment?: string;
}): Promise<{ humanVerified: true; userId: string; humanVerifiedAt: string }> {
  return bffJson<{ humanVerified: true; userId: string; humanVerifiedAt: string }>("/me/world-id", {
    method: "POST",
    body: input,
  });
}
