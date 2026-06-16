import { createServer, type IncomingMessage, type ServerResponse } from "node:http";

import { expect, test } from "@playwright/test";

let requests: Array<{
  authorization: string | undefined;
  body?: unknown;
  method: string | undefined;
  url: string | undefined;
}> = [];
let server: ReturnType<typeof createServer>;

test.beforeAll(async () => {
  requests = [];
  server = createServer((request: IncomingMessage, response: ServerResponse) => {
    const chunks: Buffer[] = [];

    request.on("data", (chunk: Buffer) => {
      chunks.push(chunk);
    });

    request.on("end", () => {
      const rawBody = Buffer.concat(chunks).toString("utf8");
      const body = rawBody.length > 0 ? (JSON.parse(rawBody) as unknown) : undefined;

    requests.push({
      authorization: request.headers.authorization,
        body,
        method: request.method,
      url: request.url,
    });

      if (request.url?.startsWith("/api/bff/listings/listing_e2e_001/purchase")) {
        response.writeHead(201, { "content-type": "application/json" });
        response.end(
          JSON.stringify({
            status: "PAID",
            order: {
              orderId: "order_e2e_001",
            },
          }),
        );
        return;
      }

    response.writeHead(200, { "content-type": "application/json" });
    response.end(
      JSON.stringify({
        id: "tx_e2e_worldcoin_payment",
        status: "success",
      }),
    );
    });
  });

  await new Promise<void>((resolve) => {
    server.listen(3102, "127.0.0.1", resolve);
  });
});

test.afterAll(async () => {
  await new Promise<void>((resolve, reject) => {
    server.close((error) => {
      if (error) {
        reject(error);
        return;
      }

      resolve();
    });
  });
});

test("confirms a Worldcoin payment through the backend route", async ({ page }) => {
  await page.goto("/e2e/worldcoin-payment");
  await page.getByRole("button", { name: "Pay with WLD" }).click();

  await expect(page).toHaveURL("/orders/order_e2e_001");
  expect(requests).toEqual([
    {
      authorization: "Bearer e2e-worldcoin-api-key",
      body: undefined,
      method: "GET",
      url: "/api/v2/minikit/transaction/tx_e2e_worldcoin_payment?app_id=app_e2e_test&type=payment",
    },
    {
      authorization: undefined,
      body: {
        confirmed: true,
      },
      method: "POST",
      url: "/api/bff/listings/listing_e2e_001/purchase",
    },
  ]);
});
