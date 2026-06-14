import { ActionButton } from "../../../components/ui/action-button";
import { combineClassNames } from "../../../components/ui/class-name";
import type { ListingViewModel } from "../listing-view-model";
import { ProductVisual } from "./product-visual";

type ListingCardProps = {
  item: ListingViewModel;
  featured?: boolean;
};

export function ListingCard({ featured = false, item }: ListingCardProps) {
  return (
    <article
      className={combineClassNames(
        "group min-h-[320px] overflow-hidden rounded-[30px] bg-gradient-to-br p-3 shadow-sm ring-1 ring-black/5 transition duration-300 hover:-translate-y-1 hover:shadow-[0_22px_60px_rgba(45,54,78,0.18)]",
        item.surface,
        featured && "md:col-span-2",
      )}
    >
      <div className="flex h-full flex-col rounded-[24px] bg-white/34 p-3 backdrop-blur-md">
        <div className="flex items-center justify-between text-xs">
          <span className="rounded-full bg-white/72 px-2.5 py-1 font-semibold text-neutral-600">
            {item.brand}
          </span>
          <span className="font-semibold text-neutral-500">{item.currency}</span>
        </div>

        <ProductVisual object={item.object} />

        <div className="mt-auto rounded-[20px] bg-white/84 p-3 shadow-sm">
          <h3 className="text-sm font-semibold leading-5 text-neutral-950">{item.title}</h3>
          <div className="mt-3 flex items-center justify-between gap-2">
            <p className="text-sm font-semibold">{item.price}</p>
            <ActionButton className="px-3 py-1.5" href={`/listings/${item.id}`} variant="primary">
              View
            </ActionButton>
          </div>
        </div>
      </div>
    </article>
  );
}
