export type ServerConfig = {
  port: number;
  hostname: string;
};

export function createServerConfig(env: NodeJS.ProcessEnv = process.env): ServerConfig {
  return {
    port: parsePort(env.PORT),
    hostname: env.HOSTNAME ?? "0.0.0.0",
  };
}

export function parsePort(value: string | undefined): number {
  if (value === undefined || value.trim().length === 0) {
    return 8080;
  }

  const port = Number(value);

  if (!Number.isInteger(port) || port <= 0 || port > 65535) {
    throw new Error("PORT must be an integer between 1 and 65535.");
  }

  return port;
}

