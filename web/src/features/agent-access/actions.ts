"use server";

import { auth } from "../../../auth";
import { getCurrentUser } from "../../lib/api/current-user.api";
import { signAgentAccessToken } from "../../lib/auth/internal-token";

// MCP クライアント接続用トークンの寿命（24h）。デモ向けに長めだが期限付き・失効可能。
const TTL_SECONDS = 60 * 60 * 24;

// 外部 MCP クライアント（ホスト上）が直結する Go API の /mcp 到達 URL。
// サーバ専用 env（NEXT_PUBLIC 不要・実行時解決）。本番は Vercel で MCP_PUBLIC_URL を注入する。
// 環境で到達先が異なるため既存 var からは導出不可:
//   HONO_API_BASE_URL=http://api:8080 は compose 内部名で外部到達不可、APP_BASE_URL は Web origin。
// 未設定のまま本番で localhost スニペットを配るのを防ぐため、本番は fail-fast にする。
function resolveMcpUrl(): string {
  const explicit = process.env.MCP_PUBLIC_URL;
  if (explicit !== undefined && explicit !== "") {
    return explicit;
  }
  if (process.env.NODE_ENV === "production") {
    throw new Error("MCP_PUBLIC_URL must be set in production.");
  }
  // dev 既定: host → api コンテナの公開ポート 8080。
  return "http://localhost:8080/mcp";
}

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

  // B方針: World ID 認証済みの人間だけがエージェントへ鍵を委任できる（人格の担保は委任点で行う）。
  // UI でもゲートするが、改ざん防止のためサーバ側でも必ず検証する（多層防御）。
  const me = await getCurrentUser();
  if (me === undefined || !me.humanVerified) {
    throw new Error("World ID verification is required to issue an agent token.");
  }

  const token = await signAgentAccessToken({ userId, expiresInSeconds: TTL_SECONDS });

  return {
    token,
    mcpUrl: resolveMcpUrl(),
    expiresInSeconds: TTL_SECONDS,
  };
}
