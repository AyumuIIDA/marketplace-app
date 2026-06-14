export function requiredEnv(name: string): string {
  const value = process.env[name];

  if (value === undefined || value.trim().length === 0) {
    throw new Error(`${name} is required.`);
  }

  return value;
}
