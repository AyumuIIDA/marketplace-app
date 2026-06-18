import NextAuth from "next-auth";
import GitHub from "next-auth/providers/github";
import Google from "next-auth/providers/google";
import Resend from "next-auth/providers/resend";
import PostgresAdapter from "@auth/pg-adapter";
import { Pool } from "pg";

import { requiredEnv } from "./src/lib/auth/env";
import { provisionBackendUser } from "./src/lib/auth/provision";

// Pool はシングルトン。env参照とPool生成はリクエスト時(=config関数の評価時)まで遅延する。
// モジュール読み込み時にenvを読むとNextのビルド(page data収集)で落ちるため。
let poolSingleton: Pool | undefined;

function getPool(): Pool {
  poolSingleton ??= new Pool({ connectionString: requiredEnv("DATABASE_URL") });

  return poolSingleton;
}

// NextAuthへ関数を渡す = 設定はリクエスト時に遅延評価される（lazy初期化）。
export const { handlers, auth, signIn, signOut } = NextAuth(() => ({
  adapter: PostgresAdapter(getPool()),
  // sign in / sign up は同一フロー（初回ログインで events.signIn が自動provisioning）。
  // 専用UIへ集約し、新規/既存はコピーだけ切り替える。
  pages: { signIn: "/signin" },
  // database方式: セッション本体はサーバ(Postgres)。cookieはopaqueなsession tokenのみ。
  // 即時失効・監査・強制ログアウトが可能。BFFはリクエスト毎に auth() でDB復元する。
  session: { strategy: "database" },
  // cookieはAuth.js本番デフォルト(__Secure-/HttpOnly/Secure/SameSite=lax)。
  // OAuthコールバックはクロスサイトのトップ遷移のため SameSite=Strict は不可(lax必須)。
  // CSRFは lax + proxy側のOrigin厳格検証で担保する。
  providers: [
    // client id/secret は AUTH_GOOGLE_ID/SECRET・AUTH_GITHUB_ID/SECRET を自動参照。
    Google,
    GitHub,
    // magic link。AUTH_RESEND_KEY を参照。from は送信元アドレス。
    Resend({ from: requiredEnv("EMAIL_FROM") }),
  ],
  callbacks: {
    // database方式では session callback に DB の user row が渡る（jwt callbackは使われない）。
    async session({ session, user }) {
      session.user.id = user.id;

      return session;
    },
  },
  events: {
    // ログイン毎に冪等provisioning（PUT /meはupsert）。初回createUser失敗時も自己回復する。
    async signIn({ user }) {
      if (user.id !== undefined) {
        await provisionBackendUser({
          userId: user.id,
          displayName: user.name ?? undefined,
          email: user.email ?? undefined,
        });
      }
    },
  },
}));
