import "dotenv/config";

import { serve } from "@hono/node-server";

import { createProductionApp } from "./app/create-production-app.js";
import { createServerConfig } from "./app/server-config.js";

const app = await createProductionApp();
const config = createServerConfig();

serve(
  {
    fetch: app.fetch,
    port: config.port,
    hostname: config.hostname,
  },
  (info) => {
    console.log(
      JSON.stringify({
        event: "api_server_started",
        hostname: info.address,
        port: info.port,
      }),
    );
  },
);

