"use server";

import { redirect } from "next/navigation";

import { sendDirectMessage } from "../../lib/api/dm.api";

// 相手(userId)へDM送信。userId は bind で束ねる。送信後はスレッドへ戻る。
export async function sendDirectMessageAction(userId: string, formData: FormData): Promise<void> {
  const body = String(formData.get("body") ?? "").trim();
  if (body.length > 0) {
    await sendDirectMessage(userId, body);
  }
  redirect(`/messages/${userId}`);
}
