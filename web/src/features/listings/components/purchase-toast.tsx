"use client";

import { useEffect, useState } from "react";

// 購入完了トースト。?purchased=1 で着地した時に一度だけ表示し、URLからパラメータを除去する
// （リロードでの再表示を防ぐ）。数秒で自動的に消える。
export function PurchaseToast({ message }: { message: string }) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const url = new URL(window.location.href);
    if (url.searchParams.has("purchased")) {
      url.searchParams.delete("purchased");
      window.history.replaceState(null, "", url.pathname + url.search + url.hash);
    }
    const timer = setTimeout(() => setVisible(false), 3500);
    return () => clearTimeout(timer);
  }, []);

  if (!visible) {
    return null;
  }

  return (
    <div aria-live="polite" className="fixed inset-x-0 bottom-6 z-50 flex justify-center px-4" role="status">
      <div className="flex items-center gap-2.5 rounded-full bg-ink px-5 py-3 text-sm font-semibold text-paper shadow-lg">
        <span className="grid size-5 place-items-center rounded-full bg-ok text-[11px] text-paper">✓</span>
        {message}
      </div>
    </div>
  );
}
