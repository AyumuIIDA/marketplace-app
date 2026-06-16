import type { PayResult } from "@worldcoin/minikit-js/commands";
import { NextResponse } from "next/server";

import { requiredEnv } from "../../../../../src/lib/auth/env";

type RequestBody = {
  listingId?: string;
  payload?: PayResult;
};

export async function POST(request: Request): Promise<Response> {
  const { listingId, payload } = (await request.json()) as RequestBody;

  if (listingId === undefined || listingId.trim().length === 0) {
    return NextResponse.json({ error: { code: "WORLDCOIN_PAYMENT_LISTING_INVALID" } }, { status: 400 });
  }

  if (payload?.transactionId === undefined) {
    return NextResponse.json({ error: { code: "WORLDCOIN_PAYMENT_PAYLOAD_INVALID" } }, { status: 400 });
  }

  const appId = requiredEnv("NEXT_PUBLIC_WORLD_ID_APP_ID");
  const apiBaseUrl = process.env.WORLDCOIN_PAYMENT_CONFIRM_BASE_URL ?? "https://developer.worldcoin.org/api/v2/minikit";
  const response = await fetch(
    `${apiBaseUrl}/transaction/${payload.transactionId}?app_id=${appId}&type=payment`,
    {
      method: "GET",
      headers: {
        authorization: `Bearer ${requiredEnv("WORLD_DEVELOPER_PORTAL_API_KEY")}`,
      },
      cache: "no-store",
    },
  );
  const transaction = (await response.json()) as unknown;

  if (!response.ok) {
    return NextResponse.json(transaction, { status: response.status });
  }

  if (!isSuccessfulWorldcoinTransaction(transaction)) {
    return NextResponse.json({ error: { code: "WORLDCOIN_PAYMENT_NOT_SUCCESSFUL" }, transaction }, { status: 402 });
  }

  const purchaseResponse = await fetch(purchaseUrl(request, listingId), {
    method: "POST",
    headers: {
      "content-type": "application/json",
      cookie: request.headers.get("cookie") ?? "",
      origin: process.env.NEXT_PUBLIC_APP_BASE_URL ?? new URL(request.url).origin,
    },
    body: JSON.stringify({ confirmed: true }),
    cache: "no-store",
  });
  const purchase = (await purchaseResponse.json()) as unknown;

  if (!purchaseResponse.ok) {
    return NextResponse.json({ error: { code: "WORLDCOIN_PAYMENT_PURCHASE_FAILED" }, purchase, transaction }, {
      status: purchaseResponse.status,
    });
  }

  return NextResponse.json({ ...toPurchaseOrderOutput(purchase), transaction }, { status: 200 });
}

function purchaseUrl(request: Request, listingId: string): string {
  const baseUrl = process.env.WORLDCOIN_PAYMENT_PURCHASE_BASE_URL;
  const encodedListingId = encodeURIComponent(listingId);

  if (baseUrl !== undefined && baseUrl.trim().length > 0) {
    return `${baseUrl.replace(/\/$/, "")}/listings/${encodedListingId}/purchase`;
  }

  return `${new URL(request.url).origin}/api/bff/listings/${encodedListingId}/purchase`;
}

function isSuccessfulWorldcoinTransaction(transaction: unknown): boolean {
  if (typeof transaction !== "object" || transaction === null) {
    return false;
  }

  const status = "status" in transaction ? transaction.status : undefined;

  return status === "success" || status === "confirmed" || status === "mined";
}

function toPurchaseOrderOutput(purchase: unknown): { order?: { orderId: string } } {
  if (typeof purchase !== "object" || purchase === null || !("order" in purchase)) {
    return {};
  }

  const order = purchase.order;

  if (typeof order !== "object" || order === null || !("orderId" in order) || typeof order.orderId !== "string") {
    return {};
  }

  return {
    order: {
      orderId: order.orderId,
    },
  };
}
