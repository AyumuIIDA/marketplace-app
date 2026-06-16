import { bffJson, isBffError } from "./bff-client";

export type Message = {
  messageId: string;
  orderId: string;
  senderId: string;
  recipientId: string;
  agentId?: string;
  body: string;
  status: "VISIBLE" | "HIDDEN";
  createdAt: string;
  hiddenAt?: string;
};

export async function listOrderMessages(orderId: string): Promise<Message[]> {
  try {
    const output = await bffJson<{ items: Message[] }>(`/orders/${orderId}/messages?limit=50`);

    return output.items;
  } catch (error) {
    if (isBffError(error) && error.status === 401) {
      return [];
    }

    throw error;
  }
}

export async function sendOrderMessage(orderId: string, body: string): Promise<Message> {
  return bffJson<Message>(`/orders/${orderId}/messages`, {
    method: "POST",
    body: {
      body,
    },
  });
}
