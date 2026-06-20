"use client";

import { useRef, useState, useTransition, type ReactNode } from "react";
import { useTranslations } from "next-intl";

import { Markdown } from "../../../components/ui/markdown";
import { Seal } from "../../../components/ui/seal";
import type { ListingViewModel } from "../../listings/listing-view-model";
import {
  discoverRagAction,
  discoverSearchAction,
  type DiscoverProvider,
} from "../actions/discover.actions";

type DiscoverViewProps = {
  initial: ListingViewModel[];
};

type Mode = "quick" | "agent";

type RetrievalMode = "semantic" | "keyword";

type AgentTurn =
  | { kind: "user"; id: string; text: string }
  | {
      kind: "assistant";
      id: string;
      text: string;
      provider: DiscoverProvider;
      listings: ListingViewModel[];
      retrievalMode?: RetrievalMode;
    };

export function DiscoverView({ initial }: DiscoverViewProps) {
  const t = useTranslations("discover");
  const tb = useTranslations("brand");
  const [mode, setMode] = useState<Mode>("quick");
  // AIベンダー選択（agentモードのみ有効）。gemini=Gemini, openai=ChatGPT。
  // Copilot風の VendorPicker で切替える。model 下位選択は backend が per-request 非対応のため出さない。
  const [provider, setProvider] = useState<DiscoverProvider>("gemini");
  const [input, setInput] = useState("");

  // 一度でも検索したら維持する。モード切替で空状態に戻して結果を失わないため、
  // モード別の派生フラグではなく独立した状態として持つ。
  const [started, setStarted] = useState(false);
  // バックエンド障害をユーザーの言い回しのせいにしない。0件と障害を明確に分ける。
  const [error, setError] = useState<string | undefined>();

  // クイック検索（意味検索）。会話なしのグリッド。
  const [results, setResults] = useState<ListingViewModel[]>(initial);
  const [quickQuery, setQuickQuery] = useState<string | undefined>();
  const [isQuickPending, startQuick] = useTransition();

  // エージェント（会話＋トレース）。
  const [turns, setTurns] = useState<AgentTurn[]>([]);
  const [isAgentPending, startAgent] = useTransition();

  const chips = [t("chip0"), t("chip1"), t("chip2")];

  function submit(raw?: string) {
    const text = (raw ?? input).trim();
    if (text.length === 0) {
      return;
    }

    setError(undefined);
    setStarted(true);

    if (mode === "quick") {
      setInput("");
      startQuick(async () => {
        try {
          const next = await discoverSearchAction(text);
          setQuickQuery(text);
          setResults(next);
        } catch {
          setError(t("searchError"));
        }
      });
      return;
    }

    setInput("");
    setTurns((current) => [...current, { kind: "user", id: `u-${Date.now()}`, text }]);
    startAgent(async () => {
      try {
        const out = await discoverRagAction(text, provider);
        setTurns((current) => [
          ...current,
          {
            kind: "assistant",
            id: `a-${Date.now()}`,
            listings: out.listings,
            provider,
            retrievalMode: out.retrievalMode,
            text: out.assistantMessage,
          },
        ]);
      } catch {
        setError(t("searchError"));
      }
    });
  }

  function reset() {
    setStarted(false);
    setError(undefined);
    setInput("");
    setQuickQuery(undefined);
    setResults(initial);
    setTurns([]);
  }

  return (
    <div className="flex min-h-screen flex-col bg-canvas text-canvas-ink">
      <header className="flex items-center justify-between px-5 py-4">
        <a className="flex items-center gap-2.5" href="/">
          <Seal size="sm" tone="dark" />
          <span className="flex flex-col leading-tight">
            <span className="text-sm font-bold tracking-tight text-canvas-ink">{tb("name")}</span>
            <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-canvas-ink-soft">
              {t("brand")}
            </span>
          </span>
        </a>
        <div className="flex items-center gap-4">
          {started && (
            <button
              className="text-sm font-medium text-canvas-ink-soft transition-colors hover:text-canvas-ink"
              onClick={reset}
              type="button"
            >
              {t("newSearch")}
            </button>
          )}
          <a
            className="text-sm font-medium text-canvas-ink-soft transition-colors hover:text-canvas-ink"
            href="/"
          >
            {t("backToMarket")}
          </a>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-4 pb-28">
        {!started ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-10 py-12">
            <div className="flex flex-col items-center gap-5 text-center">
              <Seal animate size="lg" tone="dark" />
              <h1 className="text-2xl font-semibold leading-tight text-canvas-ink sm:text-3xl">{t("greeting")}</h1>
            </div>
            <div className="w-full max-w-2xl space-y-4">
              <ModeCards mode={mode} onModeChange={setMode} />
              <Composer
                mode={mode}
                onModeChange={setMode}
                onProviderChange={setProvider}
                onSubmit={submit}
                provider={provider}
                setValue={setInput}
                showModeToggle={false}
                value={input}
              />
            </div>
            <div className="flex flex-wrap justify-center gap-2">
              {chips.map((chip) => (
                <button
                  className="rounded-full border border-canvas-line px-3 py-1.5 text-xs text-canvas-ink-soft transition-colors hover:border-seal hover:text-canvas-ink"
                  key={chip}
                  onClick={() => submit(chip)}
                  type="button"
                >
                  {chip}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex-1 py-6">
            {error !== undefined && <ErrorNotice message={error} />}
            {mode === "quick" ? (
              <QuickResults isPending={isQuickPending} query={quickQuery} results={results} />
            ) : (
              <AgentThread chips={chips} isPending={isAgentPending} onChip={submit} turns={turns} />
            )}
          </div>
        )}
      </main>

      {started && (
        <div className="sticky bottom-0 border-t border-canvas-line bg-canvas/95 backdrop-blur-sm">
          <div className="mx-auto w-full max-w-3xl px-4 py-3">
            <Composer
              mode={mode}
              onModeChange={setMode}
              onProviderChange={setProvider}
              onSubmit={submit}
              provider={provider}
              setValue={setInput}
              showModeToggle
              value={input}
            />
          </div>
        </div>
      )}
    </div>
  );
}

// ModeCards は2つの検索モードの違いを一目で示す入口（empty stateのthesis）。
// 自由なことばで検索（即時の意味検索グリッド）と AIエージェントと検索（会話で絞り込み）。
function ModeCards({ mode, onModeChange }: { mode: Mode; onModeChange: (mode: Mode) => void }) {
  const t = useTranslations("discover");
  const options: { key: Mode; label: string; desc: string; icon: ReactNode }[] = [
    { key: "quick", label: t("modeQuick"), desc: t("modeQuickDesc"), icon: <QuickIcon /> },
    { key: "agent", label: t("modeAgent"), desc: t("modeAgentDesc"), icon: <AgentIcon /> },
  ];

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {options.map((option) => {
        const active = mode === option.key;
        return (
          <button
            aria-pressed={active}
            className={
              active
                ? "flex flex-col gap-2 rounded-xl border border-seal bg-seal/10 p-4 text-left"
                : "flex flex-col gap-2 rounded-xl border border-canvas-line bg-canvas-2 p-4 text-left transition-colors hover:border-seal/50"
            }
            key={option.key}
            onClick={() => onModeChange(option.key)}
            type="button"
          >
            <span className="flex items-center gap-2">
              <span aria-hidden className={active ? "text-seal" : "text-canvas-ink-soft"}>
                {option.icon}
              </span>
              <span className="text-sm font-semibold text-canvas-ink">{option.label}</span>
            </span>
            <span className="text-xs leading-5 text-canvas-ink-soft">{option.desc}</span>
          </button>
        );
      })}
    </div>
  );
}

function QuickIcon() {
  return (
    <svg
      className="size-[18px]"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.8"
      viewBox="0 0 24 24"
    >
      <circle cx="11" cy="11" r="6" />
      <path d="m20 20-3.4-3.4" />
    </svg>
  );
}

function AgentIcon() {
  return (
    <svg
      className="size-[18px]"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.8"
      viewBox="0 0 24 24"
    >
      <path d="M21 11.5a8 8 0 0 1-11.7 7.1L4 20l1.4-4.2A8 8 0 1 1 21 11.5Z" />
      <path d="M12 8v3.5M10.25 9.75h3.5" />
    </svg>
  );
}

function Composer({
  mode,
  onModeChange,
  onProviderChange,
  onSubmit,
  provider,
  setValue,
  showModeToggle,
  value,
}: {
  mode: Mode;
  onModeChange: (mode: Mode) => void;
  onProviderChange: (provider: DiscoverProvider) => void;
  onSubmit: () => void;
  provider: DiscoverProvider;
  setValue: (value: string) => void;
  // empty stateでは ModeCards がモードを担うため pill は出さない。stickyバーでは出す。
  showModeToggle: boolean;
  value: string;
}) {
  const t = useTranslations("discover");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const modes: { key: Mode; label: string }[] = [
    { key: "quick", label: t("modeQuick") },
    { key: "agent", label: t("modeAgent") },
  ];

  // 複数行入力で内部スクロールにせず、内容に合わせて伸ばす（上限はmax-h側で抑える）。
  function autoGrow(element: HTMLTextAreaElement) {
    element.style.height = "auto";
    element.style.height = `${element.scrollHeight}px`;
  }

  return (
    <div>
      {(showModeToggle || mode === "agent") && (
        <div className="mb-2 flex flex-wrap items-center gap-2">
          {showModeToggle && (
            <div className="inline-flex rounded-full border border-canvas-line p-0.5 text-xs">
              {modes.map((item) => (
                <button
                  aria-pressed={mode === item.key}
                  className={
                    mode === item.key
                      ? "rounded-full bg-seal px-3 py-1 font-medium text-white"
                      : "rounded-full px-3 py-1 font-medium text-canvas-ink-soft transition-colors hover:text-canvas-ink"
                  }
                  key={item.key}
                  onClick={() => onModeChange(item.key)}
                  type="button"
                >
                  {item.label}
                </button>
              ))}
            </div>
          )}
          {mode === "agent" && <VendorPicker onChange={onProviderChange} value={provider} />}
        </div>
      )}
      <form
        className="flex items-end gap-2 rounded-2xl border border-canvas-line bg-canvas-2 p-2 focus-within:border-seal"
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit();
        }}
      >
        <label className="sr-only" htmlFor="discover-input">
          {t("inputLabel")}
        </label>
        <textarea
          className="min-h-11 max-h-40 flex-1 resize-none overflow-y-auto bg-transparent px-3 py-2 text-base leading-6 text-canvas-ink outline-none placeholder:text-canvas-ink-soft/70"
          id="discover-input"
          onChange={(event) => {
            setValue(event.target.value);
            autoGrow(event.target);
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              onSubmit();
              if (textareaRef.current !== null) {
                textareaRef.current.style.height = "auto";
              }
            }
          }}
          placeholder={t("placeholder")}
          ref={textareaRef}
          rows={1}
          value={value}
        />
        <button
          className="grid size-10 shrink-0 place-items-center rounded-xl bg-seal font-semibold text-white transition-colors hover:bg-seal-strong disabled:opacity-50"
          disabled={value.trim().length === 0}
          type="submit"
        >
          <span className="text-lg leading-none">→</span>
          <span className="sr-only">{t("submit")}</span>
        </button>
      </form>
    </div>
  );
}

// AIベンダー選択。Copilot等の model picker と同じ作法で、現在の選択を見せつつ切替える。
// model 下位選択はバックエンドが per-request 非対応のため出さない（vendorのみ）。
function VendorPicker({
  onChange,
  value,
}: {
  onChange: (provider: DiscoverProvider) => void;
  value: DiscoverProvider;
}) {
  const t = useTranslations("discover");
  const [open, setOpen] = useState(false);
  const options: { key: DiscoverProvider; label: string }[] = [
    { key: "gemini", label: t("providerGemini") },
    { key: "openai", label: t("providerOpenai") },
  ];
  const current = options.find((option) => option.key === value) ?? options[0];

  return (
    <div className="relative">
      <button
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label={t("providerLabel")}
        className="inline-flex items-center gap-1.5 rounded-full border border-canvas-line px-3 py-1 text-xs font-medium text-canvas-ink-soft transition-colors hover:text-canvas-ink"
        onClick={() => setOpen((isOpen) => !isOpen)}
        type="button"
      >
        <span aria-hidden className="size-1.5 rounded-full bg-seal" />
        {current.label}
        <span aria-hidden className="text-[10px] leading-none">▾</span>
      </button>
      {open && (
        <ul
          className="absolute left-0 z-10 mt-2 w-40 overflow-hidden rounded-md border border-canvas-line bg-canvas-2 py-1 shadow-md"
          role="listbox"
        >
          {options.map((option) => (
            <li aria-selected={option.key === value} key={option.key} role="option">
              <button
                className={
                  option.key === value
                    ? "flex w-full items-center justify-between px-3 py-1.5 text-xs font-medium text-canvas-ink"
                    : "flex w-full items-center justify-between px-3 py-1.5 text-xs font-medium text-canvas-ink-soft transition-colors hover:bg-canvas-line/40 hover:text-canvas-ink"
                }
                onClick={() => {
                  onChange(option.key);
                  setOpen(false);
                }}
                type="button"
              >
                {option.label}
                {option.key === value && (
                  <span aria-hidden className="text-seal">
                    ✓
                  </span>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function ErrorNotice({ message }: { message: string }) {
  return (
    <p className="mb-4 rounded-md border border-seal/40 bg-seal/10 px-4 py-3 text-sm text-canvas-ink" role="alert">
      {message}
    </p>
  );
}

function QuickResults({
  isPending,
  query,
  results,
}: {
  isPending: boolean;
  query?: string;
  results: ListingViewModel[];
}) {
  const t = useTranslations("discover");

  return (
    <section>
      <div className="mb-4 flex items-baseline justify-between border-b border-canvas-line pb-3">
        <h2 className="text-sm font-semibold text-canvas-ink">
          {query === undefined ? t("featured") : t("resultsFor", { query })}
        </h2>
        <span className="font-mono text-xs text-canvas-ink-soft">
          {isPending ? t("searching") : t("count", { count: results.length })}
        </span>
      </div>
      {isPending ? (
        <SkeletonGrid />
      ) : results.length === 0 ? (
        <p className="py-16 text-center text-sm text-canvas-ink-soft">{t("noResults")}</p>
      ) : (
        <ResultTiles items={results} />
      )}
    </section>
  );
}

function AgentThread({
  chips,
  isPending,
  onChip,
  turns,
}: {
  chips: string[];
  isPending: boolean;
  onChip: (text: string) => void;
  turns: AgentTurn[];
}) {
  const t = useTranslations("discover");

  // agentモードに切替えた直後（まだ発話なし）。空白で放置せず、ガイドを再提示する。
  if (turns.length === 0 && !isPending) {
    return (
      <div className="flex flex-col items-center gap-5 py-16 text-center">
        <p className="max-w-md text-sm leading-6 text-canvas-ink-soft">{t("agentEmptyHint")}</p>
        <div className="flex flex-wrap justify-center gap-2">
          {chips.map((chip) => (
            <button
              className="rounded-full border border-canvas-line px-3 py-1.5 text-xs text-canvas-ink-soft transition-colors hover:border-seal hover:text-canvas-ink"
              key={chip}
              onClick={() => onChip(chip)}
              type="button"
            >
              {chip}
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {turns.map((turn) =>
        turn.kind === "user" ? (
          <div className="flex justify-end" key={turn.id}>
            <p className="max-w-[85%] rounded-2xl bg-seal px-4 py-2.5 text-sm leading-6 text-white">{turn.text}</p>
          </div>
        ) : (
          <AssistantTurn key={turn.id} turn={turn} />
        ),
      )}
      {isPending && <PendingIndicator />}
    </div>
  );
}

function AssistantTurn({ turn }: { turn: Extract<AgentTurn, { kind: "assistant" }> }) {
  const t = useTranslations("discover");
  const providerLabel = turn.provider === "openai" ? t("providerOpenai") : t("providerGemini");

  return (
    <div className="space-y-3">
      {turn.text.length > 0 && <Markdown className="text-canvas-ink">{turn.text}</Markdown>}
      {turn.listings.length > 0 && <ResultTiles items={turn.listings} />}
      {/* 回答の手順を正直に開示。単段RAG（意味検索→生成）の実データ。既定で閉、興味があれば開く。 */}
      <details className="group">
        <summary className="inline-flex cursor-pointer list-none items-center gap-1 font-mono text-[11px] uppercase tracking-[0.08em] text-canvas-ink-soft transition-colors hover:text-canvas-ink [&::-webkit-details-marker]:hidden">
          <span aria-hidden className="transition-transform group-open:rotate-90">
            ›
          </span>
          {t("ragHow")}
        </summary>
        <ol className="mt-2 space-y-1 border-l border-canvas-line pl-3">
          <li className="text-xs leading-5 text-canvas-ink-soft">
            {turn.retrievalMode === "keyword"
              ? t("ragSearchKeyword", { count: turn.listings.length })
              : t("ragSearch", { count: turn.listings.length })}
          </li>
          <li className="text-xs leading-5 text-canvas-ink-soft">
            {t("ragGenerate", { provider: providerLabel })}
          </li>
        </ol>
      </details>
    </div>
  );
}

// 検索中の人間向け表示。回答の実手順は各ターンの「回答の手順」開示に出す。
function PendingIndicator() {
  const t = useTranslations("discover");

  return (
    <div className="flex items-center gap-2 text-sm text-canvas-ink-soft">
      <span className="size-1.5 shrink-0 animate-pulse rounded-full bg-seal motion-reduce:animate-none" />
      <span>{t("agentSearching")}</span>
    </div>
  );
}

function ResultTiles({ items }: { items: ListingViewModel[] }) {
  const t = useTranslations("discover");

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {items.map((item, index) => (
        <DiscoverCard
          buyLabel={t("buy")}
          index={index}
          item={item}
          key={item.id}
          matchLabel={t("matched")}
          signedLabel={t("signed")}
        />
      ))}
    </div>
  );
}

function DiscoverCard({
  buyLabel,
  index,
  item,
  matchLabel,
  signedLabel,
}: {
  buyLabel?: string;
  index: number;
  item: ListingViewModel;
  matchLabel?: string;
  signedLabel: string;
}) {
  return (
    <div
      className="group flex animate-reveal-up flex-col overflow-hidden rounded-lg border border-canvas-line bg-canvas-2 transition-colors hover:border-seal/60"
      style={{ animationDelay: `${Math.min(index, 12) * 40}ms` }}
    >
      <a
        className="flex flex-1 flex-col focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-seal"
        href={`/listings/${item.id}`}
      >
        <div className="relative aspect-square bg-canvas">
          {item.imageUrl !== undefined ? (
            // 商品画像はブラウザが storage を直接読む公開アセット
            <img alt={item.title} className="size-full object-cover" loading="lazy" src={item.imageUrl} />
          ) : (
            <span className="grid size-full place-items-center font-mono text-[11px] uppercase tracking-[0.2em] text-canvas-ink-soft/60">
              no photo
            </span>
          )}
          {item.sellerVerified && (
            <span className="absolute left-2 top-2">
              <Seal label={signedLabel} size="sm" tone="dark" />
            </span>
          )}
        </div>
        <div className="flex flex-1 flex-col gap-1 p-3">
          <p className="font-mono text-[11px] uppercase tracking-[0.1em] text-canvas-ink-soft">{item.category}</p>
          <h3 className="line-clamp-2 text-sm font-semibold leading-snug text-canvas-ink">{item.title}</h3>
          <p className="mt-auto pt-1.5 font-mono text-base font-semibold text-canvas-ink">¥{item.priceLabel}</p>
          {matchLabel !== undefined && (
            <span className="mt-1 inline-flex w-fit items-center gap-1 rounded-full border border-seal/40 px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.08em] text-seal">
              {matchLabel}
            </span>
          )}
        </div>
      </a>
      {/* discover→購入の最短動線。確認画面(/purchase)に直行。SOLD/自分の出品は確認画面側でガード。 */}
      {buyLabel !== undefined && item.status === "PUBLISHED" && (
        <a
          className="border-t border-canvas-line px-3 py-2 text-center text-xs font-semibold text-seal transition-colors hover:bg-seal hover:text-white"
          href={`/listings/${item.id}/purchase`}
        >
          {buyLabel} →
        </a>
      )}
    </div>
  );
}

function SkeletonGrid() {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {Array.from({ length: 6 }).map((_, index) => (
        <div className="overflow-hidden rounded-lg border border-canvas-line bg-canvas-2" key={index}>
          <div className="aspect-square animate-pulse bg-canvas-line/40 motion-reduce:animate-none" />
          <div className="space-y-2 p-3">
            <div className="h-3 w-1/3 animate-pulse rounded bg-canvas-line/40 motion-reduce:animate-none" />
            <div className="h-3 w-2/3 animate-pulse rounded bg-canvas-line/40 motion-reduce:animate-none" />
          </div>
        </div>
      ))}
    </div>
  );
}
