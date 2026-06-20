"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";

import { createAgentTokenAction, type AgentTokenResult } from "../actions";

// MCP クライアント接続パネル。ログイン本人がボタンで PAT を発行し、一度だけ表示する。
// 接続スニペット（Claude Code / Desktop）まで提示して、外部エージェントをそのまま結線できる。
// verified=false の場合はトークン発行を出さない（B方針: 委任できるのは World ID 認証済みの人間のみ）。
export function AgentAccessPanel({ verified }: { verified: boolean }) {
  const t = useTranslations("agentAccess");
  const [result, setResult] = useState<AgentTokenResult | undefined>(undefined);
  const [error, setError] = useState(false);
  const [pending, startTransition] = useTransition();

  function issue() {
    setError(false);
    startTransition(async () => {
      try {
        setResult(await createAgentTokenAction());
      } catch {
        setError(true);
      }
    });
  }

  const hours = result === undefined ? 0 : Math.round(result.expiresInSeconds / 3600);
  const cliSnippet =
    result === undefined
      ? ""
      : `claude mcp add --transport http marketplace ${result.mcpUrl} \\\n  --header "Authorization: Bearer ${result.token}" \\\n  --header "X-Agent-Id: my-agent"`;
  const desktopSnippet =
    result === undefined
      ? ""
      : JSON.stringify(
          {
            mcpServers: {
              marketplace: {
                command: "npx",
                args: [
                  "-y",
                  "mcp-remote",
                  result.mcpUrl,
                  "--header",
                  `Authorization:Bearer ${result.token}`,
                  "--header",
                  "X-Agent-Id:my-agent",
                ],
              },
            },
          },
          null,
          2,
        );

  return (
    <section className="max-w-2xl rounded-lg border border-line bg-surface p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-ink">{t("title")}</h2>
          <p className="mt-0.5 text-xs leading-5 text-ink-soft">{t("description")}</p>
        </div>
        {verified && (
          <button
            className="shrink-0 rounded-md bg-ink px-3 py-1.5 text-sm font-semibold text-paper outline-none transition-colors hover:bg-ink/90 focus-visible:ring-2 focus-visible:ring-ink/30 disabled:opacity-50"
            disabled={pending}
            onClick={issue}
            type="button"
          >
            {pending ? t("issuing") : result === undefined ? t("generate") : t("regenerate")}
          </button>
        )}
      </div>

      {!verified && <p className="mt-3 text-xs leading-5 text-ink-soft">{t("requiresVerification")}</p>}
      {error && <p className="mt-3 text-xs font-medium text-seal-strong">{t("error")}</p>}

      {result !== undefined && (
        <div className="mt-4 space-y-4">
          <p className="text-xs font-medium text-seal-strong">{t("once", { hours })}</p>
          <CopyBlock copiedLabel={t("copied")} copyLabel={t("copy")} label={t("tokenLabel")} value={result.token} wrap />
          <CopyBlock copiedLabel={t("copied")} copyLabel={t("copy")} label={t("cliLabel")} value={cliSnippet} />
          <CopyBlock copiedLabel={t("copied")} copyLabel={t("copy")} label={t("desktopLabel")} value={desktopSnippet} />
        </div>
      )}
    </section>
  );
}

function CopyBlock({
  copiedLabel,
  copyLabel,
  label,
  value,
  wrap = false,
}: {
  copiedLabel: string;
  copyLabel: string;
  label: string;
  value: string;
  // wrap=true: 長い単一文字列(トークン)を折り返す。false: 整形済みスニペットは横スクロールで体裁維持。
  wrap?: boolean;
}) {
  const [copied, setCopied] = useState(false);

  function copy() {
    void navigator.clipboard.writeText(value).then(() => {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    });
  }

  return (
    <div className="min-w-0">
      <div className="mb-1 flex items-center justify-between gap-2">
        <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink-faint">{label}</span>
        <button
          className="shrink-0 rounded px-2 py-0.5 text-[11px] font-medium text-ink-soft outline-none transition-colors hover:text-ink focus-visible:ring-2 focus-visible:ring-ink/30"
          onClick={copy}
          type="button"
        >
          {copied ? copiedLabel : copyLabel}
        </button>
      </div>
      <pre
        className={`rounded-md border border-line bg-paper px-3 py-2 font-mono text-[11px] leading-5 text-ink ${
          wrap ? "whitespace-pre-wrap break-all" : "overflow-x-auto whitespace-pre"
        }`}
      >
        {value}
      </pre>
    </div>
  );
}
