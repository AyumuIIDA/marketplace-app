"use client";

import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";

import { combineClassNames } from "../ui/class-name";

// World ミニアプリ＝モバイル前提。主要導線を画面下に常設し、現在地をハイライトする。
// /discover は独自の暗い没入面なので、この明面シェルのナビには出すが現在地検出のみ共有する。
type NavKey = "home" | "discover" | "sell" | "me";

// 注文は「マイ」内の注文履歴に集約したため、独立タブを持たない。
const ITEMS: { key: NavKey; href: string; match: (path: string) => boolean }[] = [
  { key: "home", href: "/", match: (path) => path === "/" },
  { key: "discover", href: "/discover", match: (path) => path.startsWith("/discover") },
  { key: "sell", href: "/sell", match: (path) => path.startsWith("/sell") || path.startsWith("/listings/new") },
  { key: "me", href: "/me", match: (path) => path.startsWith("/me") || path.startsWith("/orders") },
];

export function BottomNav() {
  const t = useTranslations("nav");
  const pathname = usePathname();

  return (
    <nav
      aria-label={t("label")}
      className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-paper/95 backdrop-blur-sm md:hidden"
    >
      <ul className="mx-auto flex max-w-[1320px]">
        {ITEMS.map((item) => {
          const active = item.match(pathname);

          return (
            <li className="flex-1" key={item.key}>
              <a
                aria-current={active ? "page" : undefined}
                className={combineClassNames(
                  "flex flex-col items-center gap-1 py-2.5 text-[10px] font-medium transition-colors",
                  active ? "text-seal-strong" : "text-ink-faint hover:text-ink-soft",
                )}
                href={item.href}
              >
                <NavIcon active={active} name={item.key} />
                <span className="leading-none">{t(item.key)}</span>
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

function NavIcon({ active, name }: { active: boolean; name: NavKey }) {
  // sell は出品を促す中心アクション。常に朱の塗りで強調する。
  if (name === "sell") {
    return (
      <span className="grid size-6 place-items-center rounded-full bg-seal text-base leading-none text-white">
        ＋
      </span>
    );
  }

  const stroke = active ? "currentColor" : "currentColor";

  return (
    <svg
      aria-hidden
      className="size-6"
      fill="none"
      stroke={stroke}
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.6"
      viewBox="0 0 24 24"
    >
      {name === "home" && <path d="M4 11.5 12 4l8 7.5M6 10v9h12v-9" />}
      {name === "discover" && (
        <>
          <circle cx="11" cy="11" r="6.5" />
          <path d="m20 20-3.6-3.6" />
        </>
      )}
      {name === "me" && (
        <>
          <circle cx="12" cy="8" r="3.4" />
          <path d="M5.5 20a6.5 6.5 0 0 1 13 0" />
        </>
      )}
    </svg>
  );
}
