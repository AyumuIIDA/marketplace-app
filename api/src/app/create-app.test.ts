import { describe, expect, it } from "vitest";

import {
  FixedClock,
  FixedIdGenerator,
  ok,
  type AppError,
  type Result,
} from "../shared/index.js";
import {
  CreateAgentUseCase,
  DisableAgentUseCase,
  ListAgentsUseCase,
} from "../modules/agents/application/index.js";
import {
  Agent,
  type AgentRepository,
  type SearchAgentsInput,
} from "../modules/agents/domain/index.js";
import {
  McpToolCall,
  RecordMcpToolCallUseCase,
  type McpToolCallRepository,
} from "../modules/mcp-audit/index.js";
import { SuggestListingFieldsUseCase } from "../modules/ai-assistance/index.js";
import { DeterministicAiAssistant } from "../modules/ai-assistance/infrastructure/index.js";
import { McpToolRunner } from "../modules/mcp/index.js";
import {
  GetCurrentUserUseCase,
  LinkWorldIdUseCase,
  UpsertCurrentUserUseCase,
} from "../modules/identity/application/index.js";
import {
  User,
  type AuthIdentity,
  type AuthIdentityRepository,
  type AuthProvider,
  type CreateAuthIdentityInput,
  type UserRepository,
} from "../modules/identity/domain/index.js";
import {
  CreateListingUseCase,
  GetListingUseCase,
  HideListingUseCase,
  ListingPurchaseService,
  ListingPublicationService,
  SearchListingsUseCase,
  UpdateDraftListingUseCase,
  computeListingPayloadHash,
} from "../modules/listings/application/index.js";
import {
  Listing,
  type ListingRepository,
  type SearchListingsInput,
} from "../modules/listings/domain/index.js";
import {
  HideMessageUseCase,
  ListMessagesUseCase,
  SendMessageUseCase,
} from "../modules/messages/application/index.js";
import {
  Message,
  type MessageRepository,
  type SearchMessagesInput,
} from "../modules/messages/domain/index.js";
import {
  GetOrderUseCase,
  ListOrdersUseCase,
  MarkOrderReceivedUseCase,
  MarkOrderShippedUseCase,
  OrderFulfillmentService,
} from "../modules/orders/application/index.js";
import {
  Order,
  type OrderRepository,
  type SearchOrdersInput,
} from "../modules/orders/domain/index.js";
import {
  CreateReviewUseCase,
  ListReviewsUseCase,
  ReviewSubmissionService,
  computeReviewPayloadHash,
} from "../modules/reviews/application/index.js";
import {
  Review,
  type ReviewRepository,
  type SearchReviewsInput,
} from "../modules/reviews/domain/index.js";
import {
  HumanSignatureApplicationService,
  HumanSignatureCreator,
} from "../modules/signatures/application/index.js";
import type {
  HumanSignatureSigner,
  SignHumanSignatureInput,
  SignHumanSignatureOutput,
} from "../modules/signatures/application/human-signature-signer.port.js";
import type {
  VerifyWorldIdProofInput,
  VerifyWorldIdProofOutput,
  WorldIdVerifier,
} from "../modules/signatures/application/world-id-verifier.port.js";
import {
  HumanSignature,
  type FindValidHumanSignatureInput,
  type HumanSignatureRepository,
  type WorldIdVerification,
  type WorldIdVerificationRepository,
} from "../modules/signatures/domain/index.js";

import { createApiApp } from "./create-app.js";
import {
  PublishListingWithHumanSignatureWorkflow,
  PurchaseItemWorkflow,
  CreateReviewWorkflow,
  ListOrderMessagesWorkflow,
  SendOrderMessageWorkflow,
  SubmitReviewWithHumanSignatureWorkflow,
  UpdateListingWithHumanSignatureWorkflow,
  type HumanSignatureWorkflowTransaction,
  type HumanSignatureWorkflowTransactionContext,
  type MessageWorkflowTransaction,
  type MessageWorkflowTransactionContext,
  type PurchaseWorkflowTransaction,
  type PurchaseWorkflowTransactionContext,
  type ReviewWorkflowTransaction,
  type ReviewWorkflowTransactionContext,
} from "./workflows/index.js";

const fixedNow = new Date("2026-06-09T00:00:00.000Z");

describe("createApiApp", () => {
  it("should return health status", async () => {
    const { app } = createTestApp();

    const response = await app.request("/health");

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ status: "ok" });
  });

  it("should create a draft listing", async () => {
    const { app } = createTestApp();

    const response = await app.request("/listings", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-user-id": "seller-1",
      },
      body: JSON.stringify(createListingRequest()),
    });

    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({
      listingId: "00000000-0000-4000-8000-000000000001",
      status: "DRAFT",
    });
  });

  it("should upsert and return the current user", async () => {
    const { app } = createTestApp();

    const upsertResponse = await app.request("/me", {
      method: "PUT",
      headers: {
        "content-type": "application/json",
        "x-user-id": "seller-1",
      },
      body: JSON.stringify({
        displayName: "Seller One",
        email: "seller@example.com",
      }),
    });
    const getResponse = await app.request("/me", {
      headers: {
        "x-user-id": "seller-1",
      },
    });

    expect(upsertResponse.status).toBe(200);
    expect(await upsertResponse.json()).toEqual({
      userId: "seller-1",
      status: "ACTIVE",
    });
    expect(getResponse.status).toBe(200);
    expect(await getResponse.json()).toMatchObject({
      userId: "seller-1",
      displayName: "Seller One",
      email: "seller@example.com",
      status: "ACTIVE",
    });
  });

  it("should create, list, and disable an agent", async () => {
    const { app } = createTestApp();

    const createResponse = await app.request("/agents", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-user-id": "seller-1",
      },
      body: JSON.stringify({
        name: "Listing assistant",
      }),
    });
    const listResponse = await app.request("/agents", {
      headers: {
        "x-user-id": "seller-1",
      },
    });
    const disableResponse = await app.request("/agents/agent-1/disable", {
      method: "POST",
      headers: {
        "x-user-id": "seller-1",
      },
    });

    expect(createResponse.status).toBe(201);
    expect(await createResponse.json()).toMatchObject({
      agentId: "agent-1",
      userId: "seller-1",
      name: "Listing assistant",
      status: "ACTIVE",
    });
    expect(listResponse.status).toBe(200);
    expect(await listResponse.json()).toMatchObject({
      items: [
        {
          agentId: "agent-1",
          status: "ACTIVE",
        },
      ],
    });
    expect(disableResponse.status).toBe(200);
    expect(await disableResponse.json()).toMatchObject({
      agentId: "agent-1",
      status: "DISABLED",
    });
  });

  it("should suggest listing fields through REST", async () => {
    const { app } = createTestApp();

    const response = await app.request("/ai-assistance/listing-fields", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-user-id": "seller-1",
      },
      body: JSON.stringify({
        userHint: "去年買った黒いスニーカー",
      }),
    });

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      title: "去年買った黒いスニーカー",
      description: expect.stringContaining("去年買った黒いスニーカー"),
      category: "general",
      condition: "good",
    });
  });

  it("should reject requests without MVP current user header", async () => {
    const { app } = createTestApp();

    const response = await app.request("/listings", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify(createListingRequest()),
    });

    expect(response.status).toBe(401);
    expect(await response.json()).toMatchObject({
      error: {
        code: "NOT_AUTHENTICATED",
      },
    });
  });

  it("mounts the MCP transport at /mcp behind auth", async () => {
    const { app } = createTestApp();

    const unauthorized = await app.request("/mcp", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{}",
    });
    expect(unauthorized.status).toBe(401);

    const initialize = await app.request("/mcp", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        accept: "application/json, text/event-stream",
        "x-user-id": "user-1",
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "initialize",
        params: {
          protocolVersion: "2025-06-18",
          capabilities: {},
          clientInfo: { name: "smoke", version: "0.0.0" },
        },
      }),
    });
    expect(initialize.status).toBe(200);
    expect(await initialize.json()).toMatchObject({
      jsonrpc: "2.0",
      id: 1,
      result: { serverInfo: { name: "human-backed-marketplace" } },
    });
  });

  it("should publish a listing with an IDKit result", async () => {
    const { app } = createTestApp();
    await createDraftListing(app);

    const response = await app.request("/listings/00000000-0000-4000-8000-000000000001/publish", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-user-id": "seller-1",
      },
      body: JSON.stringify({
        idKitResult: createIdKitResult("LISTING_PUBLISH", createListingPayloadHash()),
        expectedEnvironment: "production",
      }),
    });

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      listingId: "00000000-0000-4000-8000-000000000001",
      signatureId: "signature-1",
      worldIdVerificationId: "verification-1",
      verificationCount: 1,
      status: "PUBLISHED",
    });
  });

  it("should return a published listing and search results", async () => {
    const { app } = createTestApp();
    await createDraftListing(app);
    await app.request("/listings/00000000-0000-4000-8000-000000000001/publish", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-user-id": "seller-1",
      },
      body: JSON.stringify({
        idKitResult: createIdKitResult("LISTING_PUBLISH", createListingPayloadHash()),
      }),
    });

    const getResponse = await app.request("/listings/00000000-0000-4000-8000-000000000001", {
      headers: {
        "x-user-id": "buyer-1",
      },
    });
    const searchResponse = await app.request("/listings?keyword=Sneakers", {
      headers: {
        "x-user-id": "buyer-1",
      },
    });

    expect(getResponse.status).toBe(200);
    expect(await getResponse.json()).toMatchObject({
      listingId: "00000000-0000-4000-8000-000000000001",
      status: "PUBLISHED",
      title: "Sneakers",
    });
    expect(searchResponse.status).toBe(200);
    expect(await searchResponse.json()).toMatchObject({
      items: [
        {
          listingId: "00000000-0000-4000-8000-000000000001",
          status: "PUBLISHED",
        },
      ],
    });
  });

  it("should update a draft listing without a human signature", async () => {
    const { app, listingRepository } = createTestApp();
    await createDraftListing(app);

    const response = await app.request("/listings/00000000-0000-4000-8000-000000000001/draft", {
      method: "PATCH",
      headers: {
        "content-type": "application/json",
        "x-user-id": "seller-1",
      },
      body: JSON.stringify({
        fields: {
          title: "Draft Sneakers",
          description: "Draft description.",
          price: 8000,
          currency: "JPY",
          category: "fashion_shoes",
          condition: "good",
        },
      }),
    });

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      listingId: "00000000-0000-4000-8000-000000000001",
      title: "Draft Sneakers",
      status: "DRAFT",
    });
    expect(listingRepository.listings.get("00000000-0000-4000-8000-000000000001")?.snapshot.title).toBe("Draft Sneakers");
  });

  it("should update a published listing with an IDKit result", async () => {
    const { app, listingRepository } = createTestApp();
    await createDraftListing(app);
    await app.request("/listings/00000000-0000-4000-8000-000000000001/publish", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-user-id": "seller-1",
      },
      body: JSON.stringify({
        idKitResult: createIdKitResult("LISTING_PUBLISH", createListingPayloadHash()),
      }),
    });

    const response = await app.request("/listings/00000000-0000-4000-8000-000000000001", {
      method: "PATCH",
      headers: {
        "content-type": "application/json",
        "x-user-id": "seller-1",
      },
      body: JSON.stringify({
        fields: {
          title: "Updated Sneakers",
          description: "Updated description.",
          price: 9000,
          currency: "JPY",
          category: "fashion_shoes",
          condition: "very_good",
        },
        idKitResult: createIdKitResult("LISTING_UPDATE", createUpdatedListingPayloadHash()),
      }),
    });

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      listingId: "00000000-0000-4000-8000-000000000001",
      signatureId: "signature-2",
      worldIdVerificationId: "verification-2",
      verificationCount: 1,
      status: "PUBLISHED",
    });
    expect(listingRepository.listings.get("00000000-0000-4000-8000-000000000001")?.snapshot.title).toBe("Updated Sneakers");
  });

  it("should purchase, ship, and receive an order", async () => {
    const { app } = createTestApp();
    await createDraftListing(app);
    await app.request("/listings/00000000-0000-4000-8000-000000000001/publish", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-user-id": "seller-1",
      },
      body: JSON.stringify({
        idKitResult: createIdKitResult("LISTING_PUBLISH", createListingPayloadHash()),
      }),
    });

    const purchaseResponse = await app.request("/listings/00000000-0000-4000-8000-000000000001/purchase", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-user-id": "buyer-1",
      },
      body: JSON.stringify({
        confirmed: true,
      }),
    });
    const shipResponse = await app.request("/orders/order-1/ship", {
      method: "POST",
      headers: {
        "x-user-id": "seller-1",
      },
    });
    const receiveResponse = await app.request("/orders/order-1/receive", {
      method: "POST",
      headers: {
        "x-user-id": "buyer-1",
      },
    });

    expect(purchaseResponse.status).toBe(201);
    expect(await purchaseResponse.json()).toMatchObject({
      status: "PAID",
      order: {
        orderId: "order-1",
        listingId: "00000000-0000-4000-8000-000000000001",
        buyerId: "buyer-1",
        sellerId: "seller-1",
        status: "PAID",
      },
    });
    expect(shipResponse.status).toBe(200);
    expect(await shipResponse.json()).toMatchObject({
      orderId: "order-1",
      status: "SHIPPED",
    });
    expect(receiveResponse.status).toBe(200);
    expect(await receiveResponse.json()).toMatchObject({
      orderId: "order-1",
      status: "RECEIVED",
    });
  });

  it("should create and submit signed reviews, then complete the order", async () => {
    const { app } = createTestApp();
    await createReceivedOrder(app);

    const buyerReviewResponse = await app.request("/reviews", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-user-id": "buyer-1",
      },
      body: JSON.stringify({
        orderId: "order-1",
        rating: 5,
        comment: "Great seller.",
      }),
    });
    const sellerReviewResponse = await app.request("/reviews", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-user-id": "seller-1",
      },
      body: JSON.stringify({
        orderId: "order-1",
        rating: 5,
        comment: "Great buyer.",
      }),
    });
    const buyerSubmitResponse = await app.request("/reviews/review-1/submit", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-user-id": "buyer-1",
      },
      body: JSON.stringify({
        idKitResult: createIdKitResult("REVIEW_SUBMIT", createBuyerReviewPayloadHash()),
      }),
    });
    const sellerSubmitResponse = await app.request("/reviews/review-2/submit", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-user-id": "seller-1",
      },
      body: JSON.stringify({
        idKitResult: createIdKitResult("REVIEW_SUBMIT", createSellerReviewPayloadHash()),
      }),
    });
    const orderResponse = await app.request("/orders/order-1", {
      headers: {
        "x-user-id": "buyer-1",
      },
    });

    expect(buyerReviewResponse.status).toBe(201);
    expect(await buyerReviewResponse.json()).toMatchObject({
      reviewId: "review-1",
      reviewerId: "buyer-1",
      revieweeId: "seller-1",
      status: "DRAFT",
    });
    expect(sellerReviewResponse.status).toBe(201);
    expect(await sellerReviewResponse.json()).toMatchObject({
      reviewId: "review-2",
      reviewerId: "seller-1",
      revieweeId: "buyer-1",
      status: "DRAFT",
    });
    expect(buyerSubmitResponse.status).toBe(200);
    expect(await buyerSubmitResponse.json()).toMatchObject({
      review: {
        reviewId: "review-1",
        status: "SUBMITTED",
      },
      orderCompleted: false,
    });
    expect(sellerSubmitResponse.status).toBe(200);
    expect(await sellerSubmitResponse.json()).toMatchObject({
      review: {
        reviewId: "review-2",
        status: "SUBMITTED",
      },
      orderCompleted: true,
    });
    expect(orderResponse.status).toBe(200);
    expect(await orderResponse.json()).toMatchObject({
      orderId: "order-1",
      status: "COMPLETED",
    });
  });

  it("should send, list, and hide order messages", async () => {
    const { app } = createTestApp();
    await createReceivedOrder(app);

    const sendResponse = await app.request("/orders/order-1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-user-id": "buyer-1",
      },
      body: JSON.stringify({
        body: "Thanks, I received it.",
      }),
    });
    const listResponse = await app.request("/orders/order-1/messages", {
      headers: {
        "x-user-id": "seller-1",
      },
    });
    const hideResponse = await app.request("/messages/message-1/hide", {
      method: "POST",
      headers: {
        "x-user-id": "seller-1",
      },
    });

    expect(sendResponse.status).toBe(201);
    expect(await sendResponse.json()).toMatchObject({
      messageId: "message-1",
      orderId: "order-1",
      senderId: "buyer-1",
      recipientId: "seller-1",
      body: "Thanks, I received it.",
      status: "SENT",
    });
    expect(listResponse.status).toBe(200);
    expect(await listResponse.json()).toMatchObject({
      items: [
        {
          messageId: "message-1",
          senderId: "buyer-1",
          recipientId: "seller-1",
        },
      ],
    });
    expect(hideResponse.status).toBe(200);
    expect(await hideResponse.json()).toMatchObject({
      messageId: "message-1",
      status: "HIDDEN",
    });
  });
});

function createTestApp() {
  const agentRepository = new FakeAgentRepository();
  const authIdentityRepository = new FakeAuthIdentityRepository();
  const userRepository = new FakeUserRepository();
  const listingRepository = new FakeListingRepository();
  const messageRepository = new FakeMessageRepository();
  const orderRepository = new FakeOrderRepository();
  const reviewRepository = new FakeReviewRepository();
  const transaction = new FakeHumanSignatureWorkflowTransaction(listingRepository);
  const messageTransaction = new FakeMessageWorkflowTransaction(orderRepository, messageRepository);
  const purchaseTransaction = new FakePurchaseWorkflowTransaction(listingRepository, orderRepository);
  const reviewTransaction = new FakeReviewWorkflowTransaction(
    orderRepository,
    reviewRepository,
    transaction.humanSignatureRepository,
    transaction.worldIdVerificationRepository,
  );
  const idGenerator = new FixedIdGenerator([
    "00000000-0000-4000-8000-000000000001",
    "verification-1",
    "signature-1",
    "verification-2",
    "signature-2",
    "verification-3",
    "signature-3",
    "order-1",
  ]);
  const clock = new FixedClock(fixedNow);
  const humanSignatureService = new HumanSignatureApplicationService({
    worldIdVerifier: new FakeWorldIdVerifier(),
    humanSignatureCreator: new HumanSignatureCreator({
      humanSignatureSigner: new FakeHumanSignatureSigner({
        signatureValue: "jws-signature",
        signedAt: fixedNow,
      }),
      idGenerator,
      clock,
    }),
  });
  const listingPublicationService = new ListingPublicationService();
  const listingPurchaseService = new ListingPurchaseService();
  const orderFulfillmentService = new OrderFulfillmentService({
    idGenerator: new FixedIdGenerator(["order-1"]),
    clock,
  });
  const sendMessageUseCase = new SendMessageUseCase({
    messageRepository,
    idGenerator: new FixedIdGenerator(["message-1"]),
    clock,
  });
  const orderContext = {
    orderRepository,
  };
  const createReviewUseCase = new CreateReviewUseCase({
    reviewRepository,
    idGenerator: new FixedIdGenerator(["review-1", "review-2"]),
    clock,
  });
  const reviewSubmissionService = new ReviewSubmissionService();
  const app = createApiApp({
    agentControllerDeps: {
      createAgentUseCase: new CreateAgentUseCase({
        agentRepository,
        idGenerator: new FixedIdGenerator(["agent-1"]),
        clock,
      }),
      listAgentsUseCase: new ListAgentsUseCase({
        agentRepository,
      }),
      disableAgentUseCase: new DisableAgentUseCase({
        agentRepository,
        clock,
      }),
    },
    aiAssistanceControllerDeps: {
      suggestListingFieldsUseCase: new SuggestListingFieldsUseCase({
        aiAssistant: new DeterministicAiAssistant(),
      }),
    },
    listingControllerDeps: {
      createListingUseCase: new CreateListingUseCase({
        listingRepository,
        idGenerator,
        clock,
      }),
      getListingUseCase: new GetListingUseCase({
        listingRepository,
      }),
      searchListingsUseCase: new SearchListingsUseCase({
        listingRepository,
      }),
      updateDraftListingUseCase: new UpdateDraftListingUseCase({
        listingRepository,
        clock,
      }),
      hideListingUseCase: new HideListingUseCase({
        listingRepository,
        clock,
      }),
      publishListingWithHumanSignatureWorkflow: new PublishListingWithHumanSignatureWorkflow({
        transaction,
        listingPublicationService,
        humanSignatureService,
      }),
      updateListingWithHumanSignatureWorkflow: new UpdateListingWithHumanSignatureWorkflow({
        transaction,
        listingPublicationService,
        humanSignatureService,
      }),
      purchaseItemWorkflow: new PurchaseItemWorkflow({
        transaction: purchaseTransaction,
        listingPurchaseService,
        orderFulfillmentService,
        clock,
      }),
    },
    identityControllerDeps: {
      getCurrentUserUseCase: new GetCurrentUserUseCase({
        userRepository,
      }),
      linkWorldIdUseCase: new LinkWorldIdUseCase({
        userRepository,
        authIdentityRepository,
        worldIdVerifier: new FakeWorldIdVerifier(),
        idGenerator: new FixedIdGenerator(["auth-identity-1"]),
        clock,
      }),
      upsertCurrentUserUseCase: new UpsertCurrentUserUseCase({
        userRepository,
        clock,
      }),
    },
    orderControllerDeps: {
      getOrderUseCase: new GetOrderUseCase({
        orderFulfillmentService,
        orderContext,
      }),
      listOrdersUseCase: new ListOrdersUseCase({
        orderRepository,
      }),
      markOrderShippedUseCase: new MarkOrderShippedUseCase({
        orderFulfillmentService,
        orderContext,
        clock,
      }),
      markOrderReceivedUseCase: new MarkOrderReceivedUseCase({
        orderFulfillmentService,
        orderContext,
        clock,
      }),
    },
    messageControllerDeps: {
      hideMessageUseCase: new HideMessageUseCase({
        messageRepository,
        clock,
      }),
      listOrderMessagesWorkflow: new ListOrderMessagesWorkflow({
        transaction: messageTransaction,
        orderFulfillmentService,
        listMessagesUseCase: new ListMessagesUseCase({
          messageRepository,
        }),
      }),
      sendOrderMessageWorkflow: new SendOrderMessageWorkflow({
        transaction: messageTransaction,
        orderFulfillmentService,
        sendMessageUseCase,
      }),
    },
    reviewControllerDeps: {
      listReviewsUseCase: new ListReviewsUseCase({
        reviewRepository,
      }),
      createReviewWorkflow: new CreateReviewWorkflow({
        transaction: reviewTransaction,
        orderFulfillmentService,
        createReviewUseCase,
      }),
      submitReviewWithHumanSignatureWorkflow: new SubmitReviewWithHumanSignatureWorkflow({
        transaction: reviewTransaction,
        reviewSubmissionService,
        humanSignatureService,
        orderFulfillmentService,
        clock,
      }),
    },
    mcpTools: [],
    mcpToolRunner: new McpToolRunner({
      recordMcpToolCallUseCase: new RecordMcpToolCallUseCase({
        mcpToolCallRepository: new InMemoryMcpToolCallRepository(),
        idGenerator: new FixedIdGenerator(["mcp-tool-call-1"]),
        clock,
      }),
    }),
  }, { allowDevUserHeader: true });

  return { app, listingRepository, userRepository };
}

class InMemoryMcpToolCallRepository implements McpToolCallRepository {
  toolCalls: McpToolCall[] = [];

  async save(toolCall: McpToolCall): Promise<void> {
    this.toolCalls.push(toolCall);
  }
}

async function createDraftListing(app: ReturnType<typeof createApiApp>): Promise<void> {
  await app.request("/listings", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-user-id": "seller-1",
    },
    body: JSON.stringify(createListingRequest()),
  });
}

async function createReceivedOrder(app: ReturnType<typeof createApiApp>): Promise<void> {
  await createDraftListing(app);
  await app.request("/listings/00000000-0000-4000-8000-000000000001/publish", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-user-id": "seller-1",
    },
    body: JSON.stringify({
      idKitResult: createIdKitResult("LISTING_PUBLISH", createListingPayloadHash()),
    }),
  });
  await app.request("/listings/00000000-0000-4000-8000-000000000001/purchase", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-user-id": "buyer-1",
    },
    body: JSON.stringify({
      confirmed: true,
    }),
  });
  await app.request("/orders/order-1/ship", {
    method: "POST",
    headers: {
      "x-user-id": "seller-1",
    },
  });
  await app.request("/orders/order-1/receive", {
    method: "POST",
    headers: {
      "x-user-id": "buyer-1",
    },
  });
}

function createListingRequest() {
  return {
    title: "Sneakers",
    description: "Used a few times.",
    price: 7800,
    currency: "JPY",
    category: "fashion_shoes",
    condition: "good",
  };
}

function createListingPayloadHash(): string {
  return computeListingPayloadHash({
    listingId: "00000000-0000-4000-8000-000000000001",
    sellerId: "seller-1",
    agentId: undefined,
    title: "Sneakers",
    description: "Used a few times.",
    price: 7800,
    currency: "JPY",
    category: "fashion_shoes",
    condition: "good",
  });
}

function createUpdatedListingPayloadHash(): string {
  return computeListingPayloadHash({
    listingId: "00000000-0000-4000-8000-000000000001",
    sellerId: "seller-1",
    agentId: undefined,
    title: "Updated Sneakers",
    description: "Updated description.",
    price: 9000,
    currency: "JPY",
    category: "fashion_shoes",
    condition: "very_good",
  });
}

function createBuyerReviewPayloadHash(): string {
  return computeReviewPayloadHash({
    reviewId: "review-1",
    orderId: "order-1",
    reviewerId: "buyer-1",
    revieweeId: "seller-1",
    agentId: undefined,
    rating: 5,
    comment: "Great seller.",
  });
}

function createSellerReviewPayloadHash(): string {
  return computeReviewPayloadHash({
    reviewId: "review-2",
    orderId: "order-1",
    reviewerId: "seller-1",
    revieweeId: "buyer-1",
    agentId: undefined,
    rating: 5,
    comment: "Great buyer.",
  });
}

function createIdKitResult(
  action: "LISTING_PUBLISH" | "LISTING_UPDATE" | "REVIEW_SUBMIT",
  signalHash: string,
) {
  return {
    protocol_version: "3.0",
    nonce: "nonce-1",
    action,
    environment: "production",
    responses: [
      {
        identifier: "orb",
        signal_hash: signalHash,
        proof: "proof-1",
        merkle_root: "merkle-root-1",
        nullifier: "nullifier-1",
      },
    ],
  };
}

class FakeListingRepository implements ListingRepository {
  listings = new Map<string, Listing>();

  async save(listing: Listing): Promise<void> {
    this.listings.set(listing.id, listing);
  }

  async findById(listingId: string): Promise<Listing | undefined> {
    return this.listings.get(listingId);
  }

  async claimForPurchase(input: {
    listingId: string;
    buyerId: string;
    soldAt: Date;
  }): Promise<Listing | undefined> {
    const listing = this.listings.get(input.listingId);

    if (listing === undefined) {
      return undefined;
    }

    const snapshot = listing.snapshot;

    if (snapshot.status !== "PUBLISHED" || snapshot.sellerId === input.buyerId) {
      return undefined;
    }

    listing.markSold(input.soldAt);
    this.listings.set(listing.id, listing);

    return listing;
  }

  async search(input: SearchListingsInput): Promise<Listing[]> {
    return [...this.listings.values()]
      .filter((listing) => {
        const snapshot = listing.snapshot;
        return (
          (input.status === undefined || snapshot.status === input.status) &&
          (input.sellerId === undefined || snapshot.sellerId === input.sellerId) &&
          (input.category === undefined || snapshot.category === input.category) &&
          (input.condition === undefined || snapshot.condition === input.condition) &&
          (input.minPrice === undefined || snapshot.price >= input.minPrice) &&
          (input.maxPrice === undefined || snapshot.price <= input.maxPrice) &&
          (input.keyword === undefined ||
            snapshot.title.includes(input.keyword) ||
            snapshot.description.includes(input.keyword))
        );
      })
      .slice(0, input.limit ?? 50);
  }
}

class FakeAgentRepository implements AgentRepository {
  agents = new Map<string, Agent>();

  async save(agent: Agent): Promise<void> {
    this.agents.set(agent.id, agent);
  }

  async findById(agentId: string): Promise<Agent | undefined> {
    return this.agents.get(agentId);
  }

  async search(input: SearchAgentsInput): Promise<Agent[]> {
    return [...this.agents.values()]
      .filter((agent) => {
        const snapshot = agent.snapshot;
        return (
          (input.userId === undefined || snapshot.userId === input.userId) &&
          (input.status === undefined || snapshot.status === input.status)
        );
      })
      .slice(0, input.limit ?? 50);
  }
}

class FakeUserRepository implements UserRepository {
  users = new Map<string, User>();

  async save(user: User): Promise<void> {
    this.users.set(user.id, user);
  }

  async findById(userId: string): Promise<User | undefined> {
    return this.users.get(userId);
  }

  async findByEmail(email: string): Promise<User | undefined> {
    return [...this.users.values()].find((user) => user.snapshot.email === email);
  }
}

class FakeAuthIdentityRepository implements AuthIdentityRepository {
  identities = new Map<string, AuthIdentity>();

  async save(input: CreateAuthIdentityInput): Promise<AuthIdentity> {
    const identity: AuthIdentity = {
      id: input.id,
      userId: input.userId,
      provider: input.provider,
      providerSubject: input.providerSubject,
      createdAt: input.createdAt,
    };

    this.identities.set(this.key(input.provider, input.providerSubject), identity);

    return identity;
  }

  async findByProviderSubject(
    provider: AuthProvider,
    providerSubject: string,
  ): Promise<AuthIdentity | undefined> {
    return this.identities.get(this.key(provider, providerSubject));
  }

  private key(provider: AuthProvider, providerSubject: string): string {
    return `${provider}:${providerSubject}`;
  }
}

class FakeHumanSignatureWorkflowTransaction implements HumanSignatureWorkflowTransaction {
  humanSignatureRepository = new FakeHumanSignatureRepository();
  worldIdVerificationRepository = new FakeWorldIdVerificationRepository();

  constructor(private readonly listingRepository: ListingRepository) {}

  async run<T>(operation: (context: HumanSignatureWorkflowTransactionContext) => Promise<T>): Promise<T> {
    return operation({
      listingRepository: this.listingRepository,
      humanSignatureRepository: this.humanSignatureRepository,
      worldIdVerificationRepository: this.worldIdVerificationRepository,
    });
  }
}

class FakePurchaseWorkflowTransaction implements PurchaseWorkflowTransaction {
  constructor(
    private readonly listingRepository: ListingRepository,
    private readonly orderRepository: OrderRepository,
  ) {}

  async run<T>(operation: (context: PurchaseWorkflowTransactionContext) => Promise<T>): Promise<T> {
    return operation({
      listingRepository: this.listingRepository,
      orderRepository: this.orderRepository,
    });
  }
}

class FakeReviewWorkflowTransaction implements ReviewWorkflowTransaction {
  constructor(
    private readonly orderRepository: OrderRepository,
    private readonly reviewRepository: ReviewRepository,
    private readonly humanSignatureRepository: HumanSignatureRepository,
    private readonly worldIdVerificationRepository: WorldIdVerificationRepository,
  ) {}

  async run<T>(operation: (context: ReviewWorkflowTransactionContext) => Promise<T>): Promise<T> {
    return operation({
      orderRepository: this.orderRepository,
      reviewRepository: this.reviewRepository,
      humanSignatureRepository: this.humanSignatureRepository,
      worldIdVerificationRepository: this.worldIdVerificationRepository,
    });
  }
}

class FakeMessageWorkflowTransaction implements MessageWorkflowTransaction {
  constructor(
    private readonly orderRepository: OrderRepository,
    private readonly messageRepository: MessageRepository,
  ) {}

  async run<T>(operation: (context: MessageWorkflowTransactionContext) => Promise<T>): Promise<T> {
    return operation({
      orderRepository: this.orderRepository,
      messageRepository: this.messageRepository,
    });
  }
}

class FakeHumanSignatureRepository implements HumanSignatureRepository {
  signatures: HumanSignature[] = [];

  async save(signature: HumanSignature): Promise<void> {
    this.signatures.push(signature);
  }

  async findValidByResourcePayload(
    input: FindValidHumanSignatureInput,
  ): Promise<HumanSignature | undefined> {
    return this.signatures.find((signature) => {
      const snapshot = signature.snapshot;
      return (
        snapshot.status === "VALID" &&
        snapshot.actionType === input.actionType &&
        snapshot.resourceType === input.resourceType &&
        snapshot.resourceId === input.resourceId &&
        snapshot.payloadHash === input.payloadHash
      );
    });
  }
}

class FakeWorldIdVerificationRepository implements WorldIdVerificationRepository {
  verifications: WorldIdVerification[] = [];

  async save(verification: WorldIdVerification): Promise<void> {
    this.verifications.push(verification);
  }

  async countByUserAction(userId: string, action: string): Promise<number> {
    return this.verifications.filter((verification) => {
      const snapshot = verification.snapshot;
      return snapshot.userId === userId && snapshot.action === action;
    }).length;
  }
}

class FakeOrderRepository implements OrderRepository {
  orders = new Map<string, Order>();

  async save(order: Order): Promise<void> {
    this.orders.set(order.id, order);
  }

  async findById(orderId: string): Promise<Order | undefined> {
    return this.orders.get(orderId);
  }

  async findByListingId(listingId: string): Promise<Order | undefined> {
    return [...this.orders.values()].find((order) => order.snapshot.listingId === listingId);
  }

  async search(input: SearchOrdersInput): Promise<Order[]> {
    return [...this.orders.values()]
      .filter((order) => {
        const snapshot = order.snapshot;
        return (
          (input.participantId === undefined ||
            snapshot.buyerId === input.participantId ||
            snapshot.sellerId === input.participantId) &&
          (input.status === undefined || snapshot.status === input.status)
        );
      })
      .slice(0, input.limit ?? 50);
  }
}

class FakeReviewRepository implements ReviewRepository {
  reviews = new Map<string, Review>();

  async save(review: Review): Promise<void> {
    this.reviews.set(review.id, review);
  }

  async findById(reviewId: string): Promise<Review | undefined> {
    return this.reviews.get(reviewId);
  }

  async findSubmittedByOrderReviewer(
    orderId: string,
    reviewerId: string,
  ): Promise<Review | undefined> {
    return [...this.reviews.values()].find((review) => {
      const snapshot = review.snapshot;
      return (
        snapshot.orderId === orderId &&
        snapshot.reviewerId === reviewerId &&
        snapshot.status === "SUBMITTED"
      );
    });
  }

  async search(input: SearchReviewsInput): Promise<Review[]> {
    return [...this.reviews.values()]
      .filter((review) => {
        const snapshot = review.snapshot;
        return (
          (input.orderId === undefined || snapshot.orderId === input.orderId) &&
          (input.reviewerId === undefined || snapshot.reviewerId === input.reviewerId) &&
          (input.revieweeId === undefined || snapshot.revieweeId === input.revieweeId) &&
          (input.status === undefined || snapshot.status === input.status)
        );
      })
      .slice(0, input.limit ?? 50);
  }
}

class FakeMessageRepository implements MessageRepository {
  messages = new Map<string, Message>();

  async save(message: Message): Promise<void> {
    this.messages.set(message.id, message);
  }

  async findById(messageId: string): Promise<Message | undefined> {
    return this.messages.get(messageId);
  }

  async search(input: SearchMessagesInput): Promise<Message[]> {
    return [...this.messages.values()]
      .filter((message) => {
        const snapshot = message.snapshot;
        return (
          (input.orderId === undefined || snapshot.orderId === input.orderId) &&
          (input.participantId === undefined ||
            snapshot.senderId === input.participantId ||
            snapshot.recipientId === input.participantId) &&
          (input.senderId === undefined || snapshot.senderId === input.senderId) &&
          (input.recipientId === undefined || snapshot.recipientId === input.recipientId) &&
          (input.status === undefined || snapshot.status === input.status)
        );
      })
      .slice(0, input.limit ?? 50);
  }
}

class FakeWorldIdVerifier implements WorldIdVerifier {
  async verify(input: VerifyWorldIdProofInput): Promise<Result<VerifyWorldIdProofOutput, AppError>> {
    const action = typeof input.idKitResult.action === "string" ? input.idKitResult.action : "";
    const signalHash = input.idKitResult.responses?.[0]?.signal_hash;

    return ok({
      action,
      nullifierHash: "nullifier-1",
      verificationLevel: "orb",
      signalHash,
      environment: "production",
      verifiedAt: fixedNow,
    });
  }
}

class FakeHumanSignatureSigner implements HumanSignatureSigner {
  inputs: SignHumanSignatureInput[] = [];

  constructor(private readonly output: SignHumanSignatureOutput) {}

  async sign(input: SignHumanSignatureInput): Promise<Result<SignHumanSignatureOutput, AppError>> {
    this.inputs.push(input);
    return ok(this.output);
  }
}
