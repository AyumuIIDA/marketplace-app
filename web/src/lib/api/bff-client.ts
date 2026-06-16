import { headers } from "next/headers";

export type BffError = {
  status: number;
  code?: string;
};

type BffJsonInit = {
  body?: unknown;
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
};

export async function bffJson<T>(path: string, init: BffJsonInit = {}): Promise<T> {
  const requestHeaders = await headers();
  const host = requestHeaders.get("host");

  if (host === null) {
    throw new Error("Request host header is missing.");
  }

  const protocol = requestHeaders.get("x-forwarded-proto") ?? "http";
  const method = init.method ?? "GET";
  const isStateChanging = method !== "GET";
  const response = await fetch(`${protocol}://${host}/api/bff${path}`, {
    method,
    headers: {
      ...(isStateChanging ? { "content-type": "application/json" } : {}),
      cookie: requestHeaders.get("cookie") ?? "",
      ...(isStateChanging ? { origin: process.env.NEXT_PUBLIC_APP_BASE_URL ?? `${protocol}://${host}` } : {}),
    },
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
    cache: "no-store",
  });

  if (!response.ok) {
    let code: string | undefined;

    try {
      const body = (await response.json()) as { error?: { code?: string } };
      code = body.error?.code;
    } catch {
      code = undefined;
    }

    throw {
      status: response.status,
      code,
    } satisfies BffError;
  }

  return (await response.json()) as T;
}

export function isBffError(error: unknown): error is BffError {
  return (
    typeof error === "object" &&
    error !== null &&
    "status" in error &&
    typeof (error as { status?: unknown }).status === "number"
  );
}
