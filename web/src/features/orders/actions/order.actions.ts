"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { hideOrderMessage, sendOrderMessage } from "../../../lib/api/messages.api";
import { markOrderReceived, markOrderShipped } from "../../../lib/api/orders.api";

export async function markOrderShippedAction(formData: FormData): Promise<void> {
  const orderId = requiredFormValue(formData, "orderId");

  await markOrderShipped(orderId);
  revalidatePath(`/orders/${orderId}`);
  redirect(`/orders/${orderId}`);
}

export async function markOrderReceivedAction(formData: FormData): Promise<void> {
  const orderId = requiredFormValue(formData, "orderId");

  await markOrderReceived(orderId);
  revalidatePath(`/orders/${orderId}`);
  redirect(`/orders/${orderId}`);
}

export async function sendOrderMessageAction(formData: FormData): Promise<void> {
  const orderId = requiredFormValue(formData, "orderId");

  await sendOrderMessage(orderId, requiredFormValue(formData, "body"));
  revalidatePath(`/orders/${orderId}`);
  redirect(`/orders/${orderId}`);
}

export async function hideOrderMessageAction(formData: FormData): Promise<void> {
  const orderId = requiredFormValue(formData, "orderId");

  await hideOrderMessage(requiredFormValue(formData, "messageId"));
  revalidatePath(`/orders/${orderId}`);
  redirect(`/orders/${orderId}`);
}

function requiredFormValue(formData: FormData, name: string): string {
  const value = formData.get(name);

  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`${name} is required.`);
  }

  return value.trim();
}
