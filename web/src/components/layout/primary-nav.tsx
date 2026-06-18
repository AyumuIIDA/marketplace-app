import { getTranslations } from "next-intl/server";

import { combineClassNames } from "../ui/class-name";

// Row 2 = 二段目のセクション導線。現在地をハイライトする（Amazon の department バー相当）。
// デスクトップ限定（モバイルは bottom-nav が主要導線を担うため）。
type Section = "catalog" | "orders" | "me" | "sell" | "discover" | "board";

const ITEMS: { key: "home" | "discover" | "sell" | "board"; href: string; section: Section }[] = [
  { key: "home", href: "/", section: "catalog" },
  { key: "discover", href: "/discover", section: "discover" },
  { key: "board", href: "/board", section: "board" },
  { key: "sell", href: "/sell", section: "sell" },
];

export async function PrimaryNav({ activeSection }: { activeSection?: Section }) {
  const t = await getTranslations("nav");

  return (
    <nav aria-label={t("label")} className="hidden md:block">
      <ul className="flex items-center gap-1">
        {ITEMS.map((item) => {
          const active = item.section === activeSection;

          return (
            <li key={item.key}>
              <a
                aria-current={active ? "page" : undefined}
                className={combineClassNames(
                  "inline-flex h-11 items-center border-b-2 px-3 text-sm font-medium transition-colors",
                  active
                    ? "border-seal text-seal-strong"
                    : "border-transparent text-ink-soft hover:text-ink",
                )}
                href={item.href}
              >
                {item.key === "discover" ? (
                  <span className="inline-flex items-center gap-1.5">
                    {t("discover")}
                  </span>
                ) : (
                  t(item.key)
                )}
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
