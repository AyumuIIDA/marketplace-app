"use server";

import { auth } from "../../../auth";
import { signAgentAccessToken } from "../../lib/auth/internal-token";

// MCP クライアント接続用トークンの寿命（24h）。デモ向けに長めだが期限付き・失効可能。
const TTL_SECONDS = 60 * 60 * 24;

export type AgentTokenResult = {
  token: string;
  mcpUrl: string;
  expiresInSeconds: number;
};

// ログイン済み本人が、自分の MCP 接続用 PAT（EdDSA Bearer・scope=mcp）を発行する。
// 署名は BFF と同じ秘密鍵、検証は API の公開鍵。dev ヘッダではなく本物の鍵認証。
export async function createAgentTokenAction(): Promise<AgentTokenResult> {
  const session = await auth();
  const userId = session?.user?.id;
  if (userId === undefined) {
    throw new Error("Sign in required to issue an agent token.");
  }

  const token = await signAgentAccessToken({ userId, expiresInSeconds: TTL_SECONDS });

  return {
    token,
    // 外部 MCP クライアント（ホスト上）から到達する URL。既定はローカル。
    mcpUrl: process.env.NEXT_PUBLIC_MCP_URL ?? "http://localhost:8080/mcp",
    expiresInSeconds: TTL_SECONDS,
  };
}
