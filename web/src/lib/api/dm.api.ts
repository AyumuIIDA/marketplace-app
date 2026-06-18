import { bffJson, isBffError } from "./bff-client";

// ユーザー間DM。相手の表示名/アバターは peerId から getSellerSummary で解決する（バックエンドはIDのみ返す）。
export type DirectMessage = {
  messageId: string;
  senderId: string;
  recipientId: string;
  body: string;
  readAt?: string | null;
  createdAt: string;
};

export type InboxItem = {
  peerId: string;
  body: string;
  lastSenderId: string;
  createdAt: string;
  unread: number;
};

export async function listInbox(): Promise<InboxItem[]> {
  try {
    return (await bffJson<{ items: InboxItem[] }>("/conversations")).items;
  } catch (error) {
    if (isBffError(error) && error.status === 401) {
      return [];
    }
    throw error;
  }
}

export async function getThread(userId: string): Promise<DirectMessage[]> {
  try {
    return (await bffJson<{ items: DirectMessage[] }>(`/conversations/${userId}`)).items;
  } catch (error) {
    if (isBffError(error) && (error.status === 401 || error.status === 404)) {
      return [];
    }
    throw error;
  }
}

export async function sendDirectMessage(userId: string, body: string): Promise<DirectMessage> {
  return bffJson<DirectMessage>(`/conversations/${userId}`, { method: "POST", body: { body } });
}

// 既読化はベストエフォート（204応答＝本文なし。失敗しても送受信には影響しない）。
export async function markThreadRead(userId: string): Promise<void> {
  try {
    await bffJson(`/conversations/${userId}/read`, { method: "POST" });
  } catch {
    /* no-op */
  }
}
