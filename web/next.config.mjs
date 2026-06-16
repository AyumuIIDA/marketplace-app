import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

import createNextIntlPlugin from "next-intl/plugin";

const __dirname = dirname(fileURLToPath(import.meta.url));

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

/** @type {import('next').NextConfig} */
const nextConfig = {
  poweredByHeader: false,
  outputFileTracingRoot: __dirname,
};

export default withNextIntl(nextConfig);
