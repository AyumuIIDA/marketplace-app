import type { WorldIdAction } from "../world/world-config";

export type WorldIdRpContext = {
  rp_id: string;
  nonce: string;
  created_at: number;
  expires_at: number;
  signature: string;
};

export async function createWorldIdRpContext(action: WorldIdAction): Promise<WorldIdRpContext> {
  const response = await fetch("/api/world-id/context", {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify({ action }),
  });

  if (!response.ok) {
    throw new Error("World ID request context could not be created.");
  }

  return (await response.json()) as WorldIdRpContext;
}
