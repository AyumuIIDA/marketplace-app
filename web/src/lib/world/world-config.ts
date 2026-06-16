export type WorldIdAction = "ACCOUNT_LINK" | "LISTING_PUBLISH" | "REVIEW_SUBMIT";

export function getWorldAppId(): `app_${string}` {
  const appId = process.env.NEXT_PUBLIC_WORLD_ID_APP_ID;

  if (appId === undefined || !appId.startsWith("app_")) {
    return "app_staging_placeholder";
  }

  return appId as `app_${string}`;
}

export function getWorldIdEnvironment(): "production" | "staging" | undefined {
  const environment = process.env.NEXT_PUBLIC_WORLD_ID_ENVIRONMENT;

  if (environment === "production" || environment === "staging") {
    return environment;
  }

  return undefined;
}

export function getWorldcoinReceiverAddress(): string | undefined {
  return process.env.NEXT_PUBLIC_WORLDCOIN_RECEIVER_ADDRESS;
}

export function getWldJpyRate(): number | undefined {
  const rawRate = process.env.NEXT_PUBLIC_WLD_JPY_RATE;

  if (rawRate === undefined) {
    return undefined;
  }

  const rate = Number(rawRate);

  if (!Number.isFinite(rate) || rate <= 0) {
    return undefined;
  }

  return rate;
}
