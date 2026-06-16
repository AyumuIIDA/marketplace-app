import { getRequestConfig } from "next-intl/server";
import { cookies } from "next/headers";

import { LOCALE_COOKIE, resolveLocale } from "./locale";

// URLロケールを使わない cookie 方式。リクエスト毎に有効localeを解決し messages を読み込む。
export default getRequestConfig(async () => {
  const store = await cookies();
  const locale = resolveLocale(store.get(LOCALE_COOKIE)?.value);

  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
  };
});
