import { describe, expect, it } from "vitest";

import { DomainError } from "../../../shared/index.js";

import { Message } from "./message.entity.js";

const fixedNow = new Date("2026-06-09T00:00:00.000Z");

describe("Message", () => {
  it("should create a sent message", () => {
    const message = Message.create({
      id: "message-1",
      orderId: "order-1",
      senderId: "buyer-1",
      recipientId: "seller-1",
      body: "Hello.",
      now: fixedNow,
    });

    expect(message.snapshot).toMatchObject({
      id: "message-1",
      orderId: "order-1",
      senderId: "buyer-1",
      recipientId: "seller-1",
      body: "Hello.",
      status: "SENT",
      createdAt: fixedNow,
    });
  });

  it("should reject empty body", () => {
    expect(() =>
      Message.create({
        id: "message-1",
        orderId: "order-1",
        senderId: "buyer-1",
        recipientId: "seller-1",
        body: " ",
        now: fixedNow,
      }),
    ).toThrow(DomainError);
  });

  it("should hide by a message participant", () => {
    const message = Message.create({
      id: "message-1",
      orderId: "order-1",
      senderId: "buyer-1",
      recipientId: "seller-1",
      body: "Hello.",
      now: fixedNow,
    });

    message.hide("seller-1", fixedNow);

    expect(message.snapshot).toMatchObject({
      status: "HIDDEN",
      hiddenAt: fixedNow,
    });
  });
});
