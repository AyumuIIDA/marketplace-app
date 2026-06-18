"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";

import { Seal } from "../../../components/ui/seal";
import type { ListingViewModel } from "../../listings/listing-view-model";
import {
  discoverAgentAction,
  discoverSearchAction,
  type DiscoverAgentMessageInput,
} from "../actions/discover.actions";

type DiscoverViewProps = {
  initial: ListingViewModel[];
};

type ChatMessage = {
  id: string;
  role: "user" | "assistant" | "tool";
  content: string;
};

export function DiscoverView({ initial }: DiscoverViewProps) {
  const t = useTranslations("discover");
  const [input, setInput] = useState("");
  const [query, setQuery] = useState<string | undefined>();
  const [results, setResults] = useState<ListingViewModel[]>(initial);
  const [chatInput, setChatInput] = useState("");
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      id: "assistant-initial",
      role: "assistant",
      content: t("agentInitialMessage"),
    },
  ]);
  const [isPending, startTransition] = useTransition();
  const [isAgentPending, startAgentTransition] = useTransition();

  const chips = [t("chip0"), t("chip1"), t("chip2")];

  function run(raw: string) {
    const trimmed = raw.trim();
    if (trimmed.length === 0) {
      return;
    }
    setInput(trimmed);
    startTransition(async () => {
      const next = await discoverSearchAction(trimmed);
      setQuery(trimmed);
      setResults(next);
    });
  }

  function runAgent(raw: string) {
    const trimmed = raw.trim();
    if (trimmed.length === 0) {
      return;
    }
    const history = toAgentHistory(chatMessages);
    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: trimmed,
    };
    setChatInput("");
    setChatMessages((current) => [...current, userMessage]);
    startAgentTransition(async () => {
      const next = await discoverAgentAction(trimmed, history);
      const stepMessages = next.steps.map((step) => ({
        id: `step-${step.index}-${Date.now()}`,
        role: "tool" as const,
        content: t("agentStepMessage", {
          index: step.index,
          actor: step.actor === "llm" ? t("agentActorLlm") : t("agentActorMcp"),
          phase: t(`agentPhase.${step.phase}`),
          status: step.status,
          label: step.label,
        }),
      }));
      const assistantReply: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: "assistant",
        content: next.assistantMessage,
      };
      setQuery(trimmed);
      setResults(next.listings);
      setChatMessages((current) => [
        ...current,
        ...stepMessages,
        assistantReply,
      ]);
    });
  }

  return (
    <div className="min-h-screen bg-canvas text-canvas-ink">
      <header className="flex items-center justify-between px-5 py-4">
        <a className="flex items-center gap-2.5" href="/">
          <Seal size="sm" tone="dark" />
          <span className="font-mono text-xs uppercase tracking-[0.18em] text-canvas-ink-soft">
            {t("brand")}
          </span>
        </a>
        <a className="text-sm font-medium text-canvas-ink-soft transition-colors hover:text-canvas-ink" href="/">
          {t("backToMarket")}
        </a>
      </header>

      <main className="mx-auto max-w-5xl px-5 pb-24">
        <section className="relative grid place-items-center pt-12 pb-10 text-center md:pt-20">
          <div
            aria-hidden
            className="pointer-events-none absolute top-0 size-72 rounded-full bg-[radial-gradient(circle,rgba(216,64,47,0.22),transparent_70%)] blur-2xl"
          />
          <Seal animate className="relative" size="xl" tone="dark" />
          <p className="relative mt-8 font-mono text-[11px] uppercase tracking-[0.32em] text-seal">
            {t("eyebrow")}
          </p>
          <h1 className="relative mt-3 max-w-2xl text-3xl font-bold leading-tight tracking-tight md:text-5xl">
            {t("headline")}
          </h1>
          <p className="relative mt-4 max-w-xl text-sm leading-6 text-canvas-ink-soft md:text-base">
            {t("subhead")}
          </p>

          <form
            className="relative mt-8 flex w-full max-w-2xl items-end gap-2 rounded-lg border border-canvas-line bg-canvas-2 p-2 focus-within:border-seal"
            onSubmit={(event) => {
              event.preventDefault();
              run(input);
            }}
          >
            <label className="sr-only" htmlFor="discover-input">
              {t("inputLabel")}
            </label>
            <textarea
              className="min-h-12 flex-1 resize-none bg-transparent px-3 py-2.5 text-left text-base leading-6 text-canvas-ink outline-none placeholder:text-canvas-ink-soft/70"
              id="discover-input"
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  run(input);
                }
              }}
              placeholder={t("placeholder")}
              rows={1}
              value={input}
            />
            <button
              className="grid size-11 shrink-0 place-items-center rounded-md bg-seal font-semibold text-white transition-colors hover:bg-seal-strong disabled:opacity-50"
              disabled={isPending || input.trim().length === 0}
              type="submit"
            >
              <span className="text-lg leading-none">→</span>
              <span className="sr-only">{t("submit")}</span>
            </button>
          </form>

          <div className="relative mt-4 flex flex-wrap justify-center gap-2">
            {chips.map((chip) => (
              <button
                className="rounded-full border border-canvas-line px-3 py-1.5 text-xs text-canvas-ink-soft transition-colors hover:border-seal hover:text-canvas-ink"
                key={chip}
                onClick={() => run(chip)}
                type="button"
              >
                {chip}
              </button>
            ))}
          </div>
        </section>

        <section className="mb-8 rounded-lg border border-canvas-line bg-canvas-2 p-4">
          <div className="mb-3 flex items-center justify-between gap-3 border-b border-canvas-line pb-3">
            <h2 className="text-sm font-semibold text-canvas-ink">{t("agentTitle")}</h2>
            <span className="font-mono text-[11px] uppercase tracking-[0.12em] text-canvas-ink-soft">
              {t("agentMode")}
            </span>
          </div>
          <div className="mb-3 flex max-h-80 flex-col gap-2 overflow-y-auto pr-1">
            {chatMessages.map((message) => (
              <div
                className={
                  message.role === "user"
                    ? "ml-auto max-w-[85%] rounded-md bg-seal px-3 py-2 text-sm leading-6 text-white"
                    : message.role === "tool"
                      ? "max-w-[85%] rounded-md border border-canvas-line bg-canvas px-3 py-2 font-mono text-[11px] uppercase tracking-[0.08em] text-canvas-ink-soft"
                      : "max-w-[85%] rounded-md border border-canvas-line bg-canvas px-3 py-2 text-sm leading-6 text-canvas-ink-soft"
                }
                key={message.id}
              >
                {message.content}
              </div>
            ))}
            {isAgentPending && <AgentPendingTrace />}
          </div>
          <form
            className="flex items-end gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              runAgent(chatInput);
            }}
          >
            <label className="sr-only" htmlFor="discover-agent-input">
              {t("agentInputLabel")}
            </label>
            <textarea
              className="min-h-11 flex-1 resize-none rounded-md border border-canvas-line bg-canvas px-3 py-2 text-sm leading-6 text-canvas-ink outline-none placeholder:text-canvas-ink-soft/70 focus:border-seal"
              id="discover-agent-input"
              onChange={(event) => setChatInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  runAgent(chatInput);
                }
              }}
              placeholder={t("agentPlaceholder")}
              rows={1}
              value={chatInput}
            />
            <button
              className="grid size-11 shrink-0 place-items-center rounded-md border border-seal bg-transparent font-semibold text-seal transition-colors hover:bg-seal hover:text-white disabled:opacity-50"
              disabled={isAgentPending || chatInput.trim().length === 0}
              type="submit"
            >
              <span className="text-lg leading-none">↵</span>
              <span className="sr-only">{t("agentSubmit")}</span>
            </button>
          </form>
        </section>

        <section>
          <div className="mb-4 flex items-baseline justify-between border-b border-canvas-line pb-3">
            <h2 className="text-sm font-semibold text-canvas-ink">
              {query === undefined ? t("featured") : t("resultsFor", { query })}
            </h2>
            <span className="font-mono text-xs text-canvas-ink-soft">
              {isPending || isAgentPending ? t("searching") : t("count", { count: results.length })}
            </span>
          </div>

          {isPending || isAgentPending ? (
            <SkeletonGrid />
          ) : results.length === 0 ? (
            <p className="py-16 text-center text-sm text-canvas-ink-soft">{t("noResults")}</p>
          ) : (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {results.map((item, index) => (
                <DiscoverCard
                  index={index}
                  item={item}
                  key={item.id}
                  matchLabel={query === undefined ? undefined : t("matched")}
                  signedLabel={t("signed")}
                />
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

function AgentPendingTrace() {
  const t = useTranslations("discover");
  const pendingSteps = [
    t("agentPendingPlan"),
    t("agentPendingTool"),
    t("agentPendingReply"),
  ];

  return (
    <div className="max-w-[85%] rounded-md border border-canvas-line bg-canvas px-3 py-2">
      <div className="mb-2 font-mono text-[11px] uppercase tracking-[0.08em] text-canvas-ink-soft">
        {t("agentThinking")}
      </div>
      <ol className="space-y-1">
        {pendingSteps.map((step, index) => (
          <li className="flex items-center gap-2 text-xs leading-5 text-canvas-ink-soft" key={step}>
            <span className="grid size-4 shrink-0 place-items-center rounded-full border border-seal/50 font-mono text-[10px] text-seal">
              {index + 1}
            </span>
            <span>{step}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}

function toAgentHistory(messages: ChatMessage[]): DiscoverAgentMessageInput[] {
  return messages
    .filter(isAgentHistoryMessage)
    .map((message) => ({
      role: message.role,
      content: message.content,
    }))
    .slice(-8);
}

function isAgentHistoryMessage(
  message: ChatMessage,
): message is ChatMessage & { role: "user" | "assistant" } {
  return message.role === "user" || message.role === "assistant";
}

function DiscoverCard({
  index,
  item,
  matchLabel,
  signedLabel,
}: {
  index: number;
  item: ListingViewModel;
  matchLabel?: string;
  signedLabel: string;
}) {
  return (
    <a
      className="group flex animate-reveal-up flex-col overflow-hidden rounded-lg border border-canvas-line bg-canvas-2 transition-colors hover:border-seal/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-seal"
      href={`/listings/${item.id}`}
      style={{ animationDelay: `${Math.min(index, 12) * 40}ms` }}
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
  );
}

function SkeletonGrid() {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
      {Array.from({ length: 8 }).map((_, index) => (
        <div className="overflow-hidden rounded-lg border border-canvas-line bg-canvas-2" key={index}>
          <div className="aspect-square animate-pulse bg-canvas-line/40" />
          <div className="space-y-2 p-3">
            <div className="h-3 w-1/3 animate-pulse rounded bg-canvas-line/40" />
            <div className="h-3 w-2/3 animate-pulse rounded bg-canvas-line/40" />
          </div>
        </div>
      ))}
    </div>
  );
}
