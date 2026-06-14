import { combineClassNames } from "./class-name";

type SegmentedFilterOption = {
  label: string;
  active?: boolean;
};

type SegmentedFilterProps = {
  options: SegmentedFilterOption[];
};

export function SegmentedFilter({ options }: SegmentedFilterProps) {
  return (
    <div className="flex gap-1 rounded-full bg-white/66 p-1 text-xs shadow-sm ring-1 ring-black/6 backdrop-blur">
      {options.map((option) => (
        <button
          className={combineClassNames(
            "rounded-full px-3 py-1.5 font-medium",
            option.active ? "bg-neutral-950 text-white" : "text-neutral-500 hover:text-neutral-950",
          )}
          key={option.label}
          type="button"
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
