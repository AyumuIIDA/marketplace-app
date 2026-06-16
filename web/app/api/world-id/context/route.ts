import { signRequest } from "@worldcoin/idkit-server";
import { NextResponse } from "next/server";

import { requiredEnv } from "../../../../src/lib/auth/env";
import type { WorldIdAction } from "../../../../src/lib/world/world-config";

const allowedActions = new Set<WorldIdAction>(["ACCOUNT_LINK", "LISTING_PUBLISH", "REVIEW_SUBMIT"]);

export async function POST(request: Request): Promise<Response> {
  const body = (await request.json()) as { action?: unknown };

  if (typeof body.action !== "string" || !allowedActions.has(body.action as WorldIdAction)) {
    return NextResponse.json({ error: { code: "WORLD_ID_ACTION_INVALID" } }, { status: 400 });
  }

  const signature = signRequest({
    signingKeyHex: requiredEnv("WORLD_ID_RP_SIGNING_KEY_HEX"),
    action: body.action,
    ttl: 300,
  });

  return NextResponse.json({
    rp_id: requiredEnv("WORLD_ID_RP_ID"),
    nonce: signature.nonce,
    created_at: signature.createdAt,
    expires_at: signature.expiresAt,
    signature: signature.sig,
  });
}
