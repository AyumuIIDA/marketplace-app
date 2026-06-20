// MCP クライアント接続用の Personal Access Token を発行するデモ/運用ヘルパ。
//
// web の signAgentAccessToken と同じ方式（EdDSA / iss=next-bff / aud=hono-api / scope=mcp）で
// 署名する。API は公開鍵で検証するだけなので、このトークンを Authorization: Bearer で /mcp に渡せば
// その sub のユーザーとして MCP ツールを実行できる（dev ヘッダではなく本物の鍵認証）。
//
// 使い方（Node 20.6+。秘密鍵はリポジトリ root の .env.web から読む）:
//   cd web
//   node --env-file=../.env.web scripts/mcp-token.mjs <userId>
//   node --env-file=../.env.web scripts/mcp-token.mjs --email seller-aoi@demo.local
//   オプション: --ttl <秒, 既定86400> --agent <ラベル, 既定 mcp-demo> --url <http://localhost:8080/mcp>
//
// 注意: これは「秘密鍵を持つ運用者が発行する」道具。エンドユーザー向けの正規導線は
//       web の「エージェント接続」画面（Auth.js ログイン済みの本人が自分のトークンを発行）。

import { SignJWT, importJWK } from "jose";

function parseArgs(argv) {
  const out = { positional: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--email") out.email = argv[++i];
    else if (a === "--ttl") out.ttl = Number(argv[++i]);
    else if (a === "--agent") out.agent = argv[++i];
    else if (a === "--url") out.url = argv[++i];
    else if (a === "--db") out.db = argv[++i];
    else out.positional.push(a);
  }
  return out;
}

async function resolveUserIdByEmail(email, dbUrl) {
  const { default: pg } = await import("pg");
  const client = new pg.Client({ connectionString: dbUrl });
  await client.connect();
  try {
    const res = await client.query(
      "SELECT id, display_name, (human_verified_at IS NOT NULL) AS verified FROM users WHERE email = $1",
      [email],
    );
    if (res.rows.length === 0) throw new Error(`No user with email ${email}`);
    return res.rows[0];
  } finally {
    await client.end();
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const ttl = Number.isFinite(args.ttl) ? args.ttl : 60 * 60 * 24;
  const agent = args.agent ?? "mcp-demo";
  const mcpUrl = args.url ?? "http://localhost:8080/mcp";
  const dbUrl =
    args.db ?? process.env.DOMAIN_DATABASE_URL ?? "postgres://app:app@localhost:5432/marketplace_domain";

  let userId = args.positional[0];
  let label = "";
  if (!userId && args.email) {
    const row = await resolveUserIdByEmail(args.email, dbUrl);
    userId = row.id;
    label = ` (${row.display_name}${row.verified ? ", verified" : ""})`;
  }
  if (!userId) {
    console.error("usage: node --env-file=../.env.web scripts/mcp-token.mjs <userId> | --email <email>");
    process.exit(1);
  }

  const jwkRaw = process.env.BFF_INTERNAL_JWT_PRIVATE_KEY;
  if (!jwkRaw) {
    console.error("BFF_INTERNAL_JWT_PRIVATE_KEY is not set (run with --env-file=../.env.web).");
    process.exit(1);
  }
  const key = await importJWK(JSON.parse(jwkRaw), "EdDSA");

  const token = await new SignJWT({ scope: "mcp" })
    .setProtectedHeader({ alg: "EdDSA" })
    .setIssuer("next-bff")
    .setAudience("hono-api")
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime(`${ttl}s`)
    .sign(key);

  const claudeCli = `claude mcp add --transport http marketplace ${mcpUrl} \\\n  --header "Authorization: Bearer ${token}" \\\n  --header "X-Agent-Id: ${agent}"`;

  const desktopJson = JSON.stringify(
    {
      mcpServers: {
        marketplace: {
          command: "npx",
          args: [
            "-y",
            "mcp-remote",
            mcpUrl,
            "--header",
            `Authorization:Bearer ${token}`,
            "--header",
            `X-Agent-Id:${agent}`,
          ],
        },
      },
    },
    null,
    2,
  );

  console.log(`\n# MCP access token (PAT)  sub=${userId}${label}  scope=mcp  ttl=${ttl}s\n`);
  console.log(token);
  console.log(`\n# curl で疎通確認 (tools/list)`);
  console.log(
    `curl -s -X POST ${mcpUrl} \\\n  -H "Authorization: Bearer ${token}" \\\n  -H "X-Agent-Id: ${agent}" \\\n  -H "Content-Type: application/json" \\\n  -H "Accept: application/json, text/event-stream" \\\n  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'`,
  );
  console.log(`\n# Claude Code (native HTTP transport)`);
  console.log(claudeCli);
  console.log(`\n# Claude Desktop (claude_desktop_config.json — mcp-remote bridge)`);
  console.log(desktopJson);
  console.log("");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
