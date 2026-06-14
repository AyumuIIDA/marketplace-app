import { ActionButton } from "../../../components/ui/action-button";

export function HeroSearchPanel() {
  return (
    <div className="mx-auto mt-8 w-full max-w-3xl rounded-[34px] bg-white/84 p-3 shadow-[0_26px_90px_rgba(42,51,76,0.16)] ring-1 ring-white/80 backdrop-blur-2xl">
      <label className="block">
        <span className="sr-only">Marketplace message</span>
        <textarea
          className="min-h-32 w-full resize-none rounded-[26px] bg-transparent px-5 py-4 text-base leading-7 text-neutral-950 outline-none placeholder:text-neutral-400"
          placeholder="Ask for a verified camera under 50,000 JPY, compare desk gear, or find items ready for World ID purchase."
        />
      </label>
      <div className="flex items-center justify-between gap-3 border-t border-neutral-200/70 px-2 pb-1 pt-3">
        <div className="flex gap-2">
          <ActionButton>verified</ActionButton>
          <ActionButton>under budget</ActionButton>
          <ActionButton className="hidden sm:inline-flex">ready to buy</ActionButton>
        </div>
        <ActionButton className="grid size-10 place-items-center px-0 py-0 text-sm" variant="primary">
          Go
        </ActionButton>
      </div>
    </div>
  );
}
