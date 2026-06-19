"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";

import { Markdown } from "../../../components/ui/markdown";
import { Seal } from "../../../components/ui/seal";
import type { ListingViewModel } from "../../listings/listing-view-model";
import {
  discoverRagAction,
  discoverSearchAction,
  type DiscoverAgentActionOutput,
  type DiscoverAgentMessageInput,
  type DiscoverProvider,
} from "../actions/discover.actions";

type DiscoverViewProps = {
  initial: ListingViewModel[];
};

type Mode = "quick" | "agent";
type Step = DiscoverAgentActionOutput["steps"][number];

type AgentTurn =
  | { kind: "user"; id: string; text: string }
  | { kind: "assistant"; id: string; text: string; steps: Step[]; listings: ListingViewModel[] };

export function DiscoverView({ initial }: DiscoverViewProps) {
  const t = useTranslations("discover");
  const [mode, setMode] = useState<Mode>("quick");
  // AIベンダー選択（agentモードのみ有効）。gemini=Gemini, openai=ChatGPT。
  const [provider, setProvider] = useState<DiscoverProvider>("gemini");
  const [input, setInput] = useState("");

  // クイック検索（意味検索）。会話なしのグリッド。
  const [results, setResults] = useState<ListingViewModel[]>(initial);
  const [quickQuery, setQuickQuery] = useState<string | undefined>();
  const [isQuickPending, startQuick] = useTransition();

  // エージェント（会話＋トレース）。
  const [turns, setTurns] = useState<AgentTurn[]>([]);
  const [isAgentPending, startAgent] = useTransition();

  const started = mode === "quick" ? quickQuery !== undefined : turns.length > 0;
  const chips = [t("chip0"), t("chip1"), t("chip2")];

  function submit(raw?: string) {
    const text = (raw ?? input).trim();
    if (text.length === 0) {
      return;
    }

    if (mode === "quick") {
      setInput("");
      startQuick(async () => {
        const next = await discoverSearchAction(text);
        setQuickQuery(text);
        setResults(next);
      });
      return;
    }

    setInput("");
    setTurns((current) => [...current, { kind: "user", id: `u-${Date.now()}`, text }]);
    startAgent(async () => {
      const out = await discoverRagAction(text, provider);
      setTurns((current) => [
        ...current,
        {
          kind: "assistant",
          id: `a-${Date.now()}`,
          listings: out.listings,
          steps: out.steps,
          text: out.assistantMessage,
        },
      ]);
    });
  }

  return (
    <div className="flex min-h-screen flex-col bg-canvas text-canvas-ink">
      <header className="flex items-center justify-between px-5 py-4">
        <a className="flex items-center gap-2.5" href="/">
          <Seal size="sm" tone="dark" />
          <span className="font-mono text-xs uppercase tracking-[0.18em] text-canvas-ink-soft">{t("brand")}</span>
        </a>
        <a
          className="text-sm font-medium text-canvas-ink-soft transition-colors hover:text-canvas-ink"
          href="/"
        >
          {t("backToMarket")}
        </a>
      </header>

      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-4 pb-28">
        {!started ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-7 py-10">
            <div className="flex flex-col items-center gap-3 text-center">
              <Seal size="md" tone="dark" />
              <h1 className="text-xl font-semibold text-canvas-ink">{t("greeting")}</h1>
            </div>
            <div className="w-full max-w-2xl">
              <Composer mode={mode} onModeChange={setMode} onProviderChange={setProvider} onSubmit={submit} provider={provider} setValue={setInput} value={input} />
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
            {mode === "quick" ? (
              <QuickResults isPending={isQuickPending} query={quickQuery} results={results} />
            ) : (
              <AgentThread isPending={isAgentPending} turns={turns} />
            )}
          </div>
        )}
      </main>

      {started && (
        <div className="sticky bottom-0 border-t border-canvas-line bg-canvas/95 backdrop-blur-sm">
          <div className="mx-auto w-full max-w-3xl px-4 py-3">
            <Composer mode={mode} onModeChange={setMode} onProviderChange={setProvider} onSubmit={submit} provider={provider} setValue={setInput} value={input} />
          </div>
        </div>
      )}
    </div>
  );
}

function Composer({
  mode,
  onModeChange,
  onProviderChange,
  onSubmit,
  provider,
  setValue,
  value,
}: {
  mode: Mode;
  onModeChange: (mode: Mode) => void;
  onProviderChange: (provider: DiscoverProvider) => void;
  onSubmit: () => void;
  provider: DiscoverProvider;
  setValue: (value: string) => void;
  value: string;
}) {
  const t = useTranslations("discover");
  const modes: { key: Mode; label: string }[] = [
    { key: "quick", label: t("modeQuick") },
    { key: "agent", label: t("modeAgent") },
  ];
  const providers: { key: DiscoverProvider; label: string }[] = [
    { key: "gemini", label: t("providerGemini") },
    { key: "openai", label: t("providerOpenai") },
  ];

  return (
    <div>
      <div className="mb-2 flex flex-wrap items-center gap-2">
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
        {mode === "agent" && (
          <div
            aria-label={t("providerLabel")}
            className="inline-flex rounded-full border border-canvas-line p-0.5 text-xs"
          >
            {providers.map((item) => (
              <button
                aria-pressed={provider === item.key}
                className={
                  provider === item.key
                    ? "rounded-full bg-seal px-3 py-1 font-medium text-white"
                    : "rounded-full px-3 py-1 font-medium text-canvas-ink-soft transition-colors hover:text-canvas-ink"
                }
                key={item.key}
                onClick={() => onProviderChange(item.key)}
                type="button"
              >
                {item.label}
              </button>
            ))}
          </div>
        )}
      </div>
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
          className="min-h-11 flex-1 resize-none bg-transparent px-3 py-2 text-base leading-6 text-canvas-ink outline-none placeholder:text-canvas-ink-soft/70"
          id="discover-input"
          onChange={(event) => setValue(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              onSubmit();
            }
          }}
          placeholder={t("placeholder")}
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

function AgentThread({ isPending, turns }: { isPending: boolean; turns: AgentTurn[] }) {
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
      {isPending && <PendingTrace />}
    </div>
  );
}

function AssistantTurn({ turn }: { turn: Extract<AgentTurn, { kind: "assistant" }> }) {
  return (
    <div className="space-y-3">
      {turn.steps.length > 0 && <AgentTrace steps={turn.steps} />}
      {turn.text.length > 0 && <Markdown className="text-canvas-ink">{turn.text}</Markdown>}
      {turn.listings.length > 0 && <ResultTiles items={turn.listings} />}
    </div>
  );
}

function AgentTrace({ steps }: { steps: Step[] }) {
  const t = useTranslations("discover");
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded-md border border-canvas-line bg-canvas-2 p-3">
      <ol className="space-y-1.5">
        {steps.map((step) => (
          <li className="flex items-center gap-2 text-xs leading-5 text-canvas-ink-soft" key={step.index}>
            <span className="size-1.5 shrink-0 rounded-full bg-seal" />
            <span>{t(`trace.${step.phase}`)}</span>
          </li>
        ))}
      </ol>
      <button
        aria-expanded={open}
        className="mt-2 font-mono text-[11px] uppercase tracking-[0.08em] text-canvas-ink-soft transition-colors hover:text-canvas-ink"
        onClick={() => setOpen((current) => !current)}
        type="button"
      >
        {open ? t("traceHide") : t("traceDetails")}
      </button>
      {open && (
        <ol className="mt-2 space-y-1 border-t border-canvas-line pt-2">
          {steps.map((step) => (
            <li
              className="font-mono text-[11px] uppercase tracking-[0.06em] text-canvas-ink-soft/80"
              key={`raw-${step.index}`}
            >
              {t("agentStepMessage", {
                actor: step.actor === "llm" ? t("agentActorLlm") : t("agentActorMcp"),
                index: step.index,
                label: step.label,
                phase: t(`agentPhase.${step.phase}`),
                status: step.status,
              })}
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

function PendingTrace() {
  const t = useTranslations("discover");
  const pendingSteps = [t("agentPendingPlan"), t("agentPendingTool"), t("agentPendingReply")];

  return (
    <div className="rounded-md border border-canvas-line bg-canvas-2 p-3">
      <div className="mb-2 font-mono text-[11px] uppercase tracking-[0.08em] text-canvas-ink-soft">
        {t("agentThinking")}
      </div>
      <ol className="space-y-1.5">
        {pendingSteps.map((step) => (
          <li className="flex items-center gap-2 text-xs leading-5 text-canvas-ink-soft" key={step}>
            <span className="size-1.5 shrink-0 animate-pulse rounded-full bg-seal motion-reduce:animate-none" />
            <span>{step}</span>
          </li>
        ))}
      </ol>
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

function toHistory(turns: AgentTurn[]): DiscoverAgentMessageInput[] {
  return turns
    .map((turn) => ({ content: turn.text, role: turn.kind === "user" ? ("user" as const) : ("assistant" as const) }))
    .slice(-8);
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
          {item.signed && (
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
