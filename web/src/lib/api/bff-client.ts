import { headers } from "next/headers";

export type BffError = {
  status: number;
  code?: string;
};

export async function bffJson<T>(path: string): Promise<T> {
  const requestHeaders = await headers();
  const host = requestHeaders.get("host");

  if (host === null) {
    throw new Error("Request host header is missing.");
  }

  const protocol = requestHeaders.get("x-forwarded-proto") ?? "http";
  const response = await fetch(`${protocol}://${host}/api/bff${path}`, {
    headers: {
      cookie: requestHeaders.get("cookie") ?? "",
    },
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
