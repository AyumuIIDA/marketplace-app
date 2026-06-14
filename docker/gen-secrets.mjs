// ローカル用シークレットを生成し、所有権境界で分割した .env.api / .env.web を作成する。
//   node docker/gen-secrets.mjs
// EdDSA鍵ペアを生成し【公開鍵→.env.api / 秘密鍵→.env.web】に振り分ける。
// これにより api の環境には公開鍵しか存在せず、内部トークンを署名(偽造)できない非対称性を保つ。
// OAuth値は生成後に .env.web へ手動で追記する。生成物は git 管理外（本番鍵とは無関係）。
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { randomBytes } from "node:crypto";
import { generateKeyPair, exportJWK } from "jose";

const { publicKey, privateKey } = await generateKeyPair("EdDSA", { extractable: true });
const publicJwk = JSON.stringify(await exportJWK(publicKey));
const privateJwk = JSON.stringify(await exportJWK(privateKey));

// ファイルごとに「そのサービスが持つべき秘密だけ」を充填する。鍵は同居させない。
const targets = [
  {
    example: ".env.api.example",
    out: ".env.api",
    replacements: {
      BFF_INTERNAL_JWT_PUBLIC_KEY: publicJwk,
      HUMAN_SIGNATURE_JWS_SECRET: randomBytes(32).toString("base64"),
    },
  },
  {
    example: ".env.web.example",
    out: ".env.web",
    replacements: {
      AUTH_SECRET: randomBytes(32).toString("base64"),
      BFF_INTERNAL_JWT_PRIVATE_KEY: privateJwk,
    },
  },
];

for (const { example, out, replacements } of targets) {
  if (existsSync(out)) {
    console.error(`[gen-secrets] ${out} は既に存在します。上書きを避けるため中止します。`);
    process.exit(1);
  }

  const filled = readFileSync(example, "utf8")
    .split("\n")
    .map((line) => {
      const match = line.match(/^([A-Z_]+)=/);
      if (match && replacements[match[1]] !== undefined) {
        return `${match[1]}=${replacements[match[1]]}`;
      }
      return line;
    });

  writeFileSync(out, filled.join("\n"));
  console.log(`[gen-secrets] ${out} を生成しました。`);
}

console.log("[gen-secrets] 完了。.env.web の AUTH_GOOGLE_* / AUTH_GITHUB_* を編集してください。");
