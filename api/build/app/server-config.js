export function createServerConfig(env = process.env) {
    return {
        port: parsePort(env.PORT),
        hostname: env.HOSTNAME ?? "0.0.0.0",
    };
}
export function parsePort(value) {
    if (value === undefined || value.trim().length === 0) {
        return 8080;
    }
    const port = Number(value);
    if (!Number.isInteger(port) || port <= 0 || port > 65535) {
        throw new Error("PORT must be an integer between 1 and 65535.");
    }
    return port;
}
