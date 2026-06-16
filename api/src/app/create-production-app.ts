import OpenAI from "openai";
import { importJWK, type JWK } from "jose";

import { createDb, type Db } from "../db/client.js";
import { UuidGenerator, SystemClock } from "../shared/index.js";
import {
  CreateAgentUseCase,
  DisableAgentUseCase,
  ListAgentsUseCase,
} from "../modules/agents/index.js";
import {
  DrizzleAgentRepository,
} from "../modules/agents/infrastructure/index.js";
import {
  CompareListingsUseCase,
  SuggestListingFieldsUseCase,
  SuggestMessageUseCase,
  SuggestPriceUseCase,
  SuggestReviewUseCase,
  type AiAssistant,
} from "../modules/ai-assistance/index.js";
import {
  DeterministicAiAssistant,
  GeminiAiAssistant,
  OpenAiAiAssistant,
} from "../modules/ai-assistance/infrastructure/index.js";
import { RecordMcpToolCallUseCase } from "../modules/mcp-audit/index.js";
import { DrizzleMcpToolCallRepository } from "../modules/mcp-audit/infrastructure/index.js";
import {
  GetCurrentUserUseCase,
  LinkWorldIdUseCase,
  UpsertCurrentUserUseCase,
} from "../modules/identity/index.js";
import {
  DrizzleAuthIdentityRepository,
  DrizzleUserRepository,
} from "../modules/identity/infrastructure/index.js";
import {
  CreateListingUseCase,
  GetListingUseCase,
  HideListingUseCase,
  ListingPublicationService,
  ListingPurchaseService,
  SearchListingsUseCase,
  UpdateDraftListingUseCase,
} from "../modules/listings/index.js";
import { DrizzleListingRepository } from "../modules/listings/infrastructure/index.js";
import {
  HideMessageUseCase,
  ListMessagesUseCase,
  SendMessageUseCase,
} from "../modules/messages/index.js";
import { DrizzleMessageRepository } from "../modules/messages/infrastructure/index.js";
import {
  GetOrderUseCase,
  ListOrdersUseCase,
  MarkOrderReceivedUseCase,
  MarkOrderShippedUseCase,
  OrderFulfillmentService,
} from "../modules/orders/index.js";
import { DrizzleOrderRepository } from "../modules/orders/infrastructure/index.js";
import {
  CreateReviewUseCase,
  ListReviewsUseCase,
  ReviewSubmissionService,
} from "../modules/reviews/index.js";
import { DrizzleReviewRepository } from "../modules/reviews/infrastructure/index.js";
import {
  HumanSignatureApplicationService,
  HumanSignatureCreator,
} from "../modules/signatures/index.js";
import {
  JwsHumanSignatureSigner,
  WorldIdVerifierClient,
} from "../modules/signatures/infrastructure/index.js";
import {
  CreateListingDraftTool,
  CreateReviewTool,
  PublishListingTool,
  PurchaseItemTool,
  SearchListingsTool,
  SendMessageTool,
  SubmitReviewTool,
  SuggestListingFieldsTool,
  SuggestPriceTool,
  SuggestReviewTool,
  UpdateListingTool,
  GetCurrentUserTool,
  GetListingTool,
  ListOrdersTool,
  ListMessagesTool,
  MarkShippedTool,
  MarkReceivedTool,
  SuggestMessageTool,
  CompareListingsTool,
  McpToolRunner,
  type McpTool,
} from "../modules/mcp/index.js";
import {
  CreateReviewWorkflow,
  ListOrderMessagesWorkflow,
  PublishListingWithHumanSignatureWorkflow,
  PurchaseItemWorkflow,
  SendOrderMessageWorkflow,
  SubmitReviewWithHumanSignatureWorkflow,
  UpdateListingWithHumanSignatureWorkflow,
  CompareListingsWorkflow,
} from "./workflows/index.js";
import {
  DrizzleHumanSignatureWorkflowTransaction,
  DrizzleMessageWorkflowTransaction,
  DrizzlePurchaseWorkflowTransaction,
  DrizzleReviewWorkflowTransaction,
} from "./workflows/infrastructure.js";

import { createApiApp } from "./create-app.js";

export async function createProductionApp(db: Db = createDb()) {
  const idGenerator = new UuidGenerator();
  const clock = new SystemClock();
  const agentRepository = new DrizzleAgentRepository(db);
  const authIdentityRepository = new DrizzleAuthIdentityRepository(db);
  const userRepository = new DrizzleUserRepository(db);
  const listingRepository = new DrizzleListingRepository(db);
  const messageRepository = new DrizzleMessageRepository(db);
  const orderRepository = new DrizzleOrderRepository(db);
  const reviewRepository = new DrizzleReviewRepository(db);
  const humanSignatureCreator = new HumanSignatureCreator({
    humanSignatureSigner: new JwsHumanSignatureSigner({
      issuer: requiredEnv("HUMAN_SIGNATURE_ISSUER"),
      secret: requiredEnv("HUMAN_SIGNATURE_JWS_SECRET"),
    }),
    idGenerator,
    clock,
  });
  const worldIdVerifier = new WorldIdVerifierClient({
    rpId: requiredEnv("WORLD_ID_RP_ID"),
  });
  const listingPublicationService = new ListingPublicationService();
  const listingPurchaseService = new ListingPurchaseService();
  const orderFulfillmentService = new OrderFulfillmentService({
    idGenerator,
    clock,
  });
  const sendMessageUseCase = new SendMessageUseCase({
    messageRepository,
    idGenerator,
    clock,
  });
  const orderContext = {
    orderRepository,
  };
  const createReviewUseCase = new CreateReviewUseCase({
    reviewRepository,
    idGenerator,
    clock,
  });
  const reviewSubmissionService = new ReviewSubmissionService();
  const humanSignatureService = new HumanSignatureApplicationService({
    worldIdVerifier,
    humanSignatureCreator,
  });
  const humanSignatureWorkflowTransaction = new DrizzleHumanSignatureWorkflowTransaction(db);
  const messageWorkflowTransaction = new DrizzleMessageWorkflowTransaction(db);
  const purchaseWorkflowTransaction = new DrizzlePurchaseWorkflowTransaction(db);
  const reviewWorkflowTransaction = new DrizzleReviewWorkflowTransaction(db);

  // HTTP controllerとMCP toolで共有するUseCase / Workflow。
  const createListingUseCase = new CreateListingUseCase({
    listingRepository,
    idGenerator,
    clock,
  });
  const searchListingsUseCase = new SearchListingsUseCase({ listingRepository });
  const publishListingWithHumanSignatureWorkflow = new PublishListingWithHumanSignatureWorkflow({
    transaction: humanSignatureWorkflowTransaction,
    listingPublicationService,
    humanSignatureService,
  });
  const updateListingWithHumanSignatureWorkflow = new UpdateListingWithHumanSignatureWorkflow({
    transaction: humanSignatureWorkflowTransaction,
    listingPublicationService,
    humanSignatureService,
  });
  const purchaseItemWorkflow = new PurchaseItemWorkflow({
    transaction: purchaseWorkflowTransaction,
    listingPurchaseService,
    orderFulfillmentService,
    clock,
  });
  const createReviewWorkflow = new CreateReviewWorkflow({
    transaction: reviewWorkflowTransaction,
    orderFulfillmentService,
    createReviewUseCase,
  });
  const submitReviewWithHumanSignatureWorkflow = new SubmitReviewWithHumanSignatureWorkflow({
    transaction: reviewWorkflowTransaction,
    reviewSubmissionService,
    humanSignatureService,
    orderFulfillmentService,
    clock,
  });
  const sendOrderMessageWorkflow = new SendOrderMessageWorkflow({
    transaction: messageWorkflowTransaction,
    orderFulfillmentService,
    sendMessageUseCase,
  });

  // AI出品支援。AiAssistant port経由。providerはenvで選択（既定はデモ安定優先の決定論fake）。
  const aiAssistant: AiAssistant = createAiAssistant();
  const suggestListingFieldsUseCase = new SuggestListingFieldsUseCase({ aiAssistant });
  const suggestPriceUseCase = new SuggestPriceUseCase({ aiAssistant });
  const suggestReviewUseCase = new SuggestReviewUseCase({ aiAssistant });
  const suggestMessageUseCase = new SuggestMessageUseCase({ aiAssistant });
  const compareListingsUseCase = new CompareListingsUseCase({ aiAssistant });

  // 読取/ライフサイクル系。REST controller と MCP tool で同一インスタンスを共有する。
  const getCurrentUserUseCase = new GetCurrentUserUseCase({ userRepository });
  const getListingUseCase = new GetListingUseCase({ listingRepository });
  const listOrdersUseCase = new ListOrdersUseCase({ orderRepository });
  const markOrderShippedUseCase = new MarkOrderShippedUseCase({
    orderFulfillmentService,
    orderContext,
    clock,
  });
  const markOrderReceivedUseCase = new MarkOrderReceivedUseCase({
    orderFulfillmentService,
    orderContext,
    clock,
  });
  const listOrderMessagesWorkflow = new ListOrderMessagesWorkflow({
    transaction: messageWorkflowTransaction,
    orderFulfillmentService,
    listMessagesUseCase: new ListMessagesUseCase({ messageRepository }),
  });
  const compareListingsWorkflow = new CompareListingsWorkflow({
    getListingUseCase,
    compareListingsUseCase,
  });

  const mcpTools: McpTool[] = [
    new CreateListingDraftTool({ createListingUseCase }),
    new SearchListingsTool({ searchListingsUseCase }),
    new PublishListingTool({ publishListingWithHumanSignatureWorkflow }),
    new UpdateListingTool({ updateListingWithHumanSignatureWorkflow }),
    new PurchaseItemTool({ purchaseItemWorkflow }),
    new CreateReviewTool({ createReviewWorkflow }),
    new SubmitReviewTool({ submitReviewWithHumanSignatureWorkflow }),
    new SendMessageTool({ sendOrderMessageWorkflow }),
    new SuggestListingFieldsTool({ suggestListingFieldsUseCase }),
    new SuggestPriceTool({ suggestPriceUseCase }),
    new SuggestReviewTool({ suggestReviewUseCase }),
    new GetCurrentUserTool({ getCurrentUserUseCase }),
    new GetListingTool({ getListingUseCase }),
    new ListOrdersTool({ listOrdersUseCase }),
    new ListMessagesTool({ listOrderMessagesWorkflow }),
    new MarkShippedTool({ markOrderShippedUseCase }),
    new MarkReceivedTool({ markOrderReceivedUseCase }),
    new SuggestMessageTool({ suggestMessageUseCase }),
    new CompareListingsTool({ compareListingsWorkflow }),
  ];

  // MCP tool呼び出しの監査記録。全tool実行をrunner経由で mcp_tool_calls へ残す。
  const mcpToolRunner = new McpToolRunner({
    recordMcpToolCallUseCase: new RecordMcpToolCallUseCase({
      mcpToolCallRepository: new DrizzleMcpToolCallRepository(db),
      idGenerator,
      clock,
    }),
  });

  // BFF内部トークンの検証鍵（EdDSA公開鍵）を起動時にimportし、fail-fastする。
  const authConfig = {
    publicKey: await importJWK(
      JSON.parse(requiredEnv("BFF_INTERNAL_JWT_PUBLIC_KEY")) as JWK,
      "EdDSA",
    ),
    // fail-safe: 本番では env を誤設定しても dev ヘッダ認証を絶対に有効化しない。
    allowDevUserHeader:
      process.env.BFF_ALLOW_DEV_USER_HEADER === "true" &&
      process.env.NODE_ENV !== "production",
  };

  return createApiApp({
    agentControllerDeps: {
      createAgentUseCase: new CreateAgentUseCase({
        agentRepository,
        idGenerator,
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
      suggestListingFieldsUseCase,
    },
    listingControllerDeps: {
      createListingUseCase,
      getListingUseCase,
      searchListingsUseCase,
      updateDraftListingUseCase: new UpdateDraftListingUseCase({
        listingRepository,
        clock,
      }),
      hideListingUseCase: new HideListingUseCase({
        listingRepository,
        clock,
      }),
      publishListingWithHumanSignatureWorkflow,
      updateListingWithHumanSignatureWorkflow,
      purchaseItemWorkflow,
    },
    identityControllerDeps: {
      getCurrentUserUseCase,
      linkWorldIdUseCase: new LinkWorldIdUseCase({
        userRepository,
        authIdentityRepository,
        worldIdVerifier,
        idGenerator,
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
      listOrdersUseCase,
      markOrderShippedUseCase,
      markOrderReceivedUseCase,
    },
    messageControllerDeps: {
      hideMessageUseCase: new HideMessageUseCase({
        messageRepository,
        clock,
      }),
      listOrderMessagesWorkflow,
      sendOrderMessageWorkflow,
    },
    reviewControllerDeps: {
      listReviewsUseCase: new ListReviewsUseCase({
        reviewRepository,
      }),
      createReviewWorkflow,
      submitReviewWithHumanSignatureWorkflow,
    },
    mcpTools,
    mcpToolRunner,
  }, authConfig);
}

function requiredEnv(name: string): string {
  const value = process.env[name];

  if (value === undefined || value.trim().length === 0) {
    throw new Error(`${name} is required.`);
  }

  return value;
}

function createAiAssistant(): AiAssistant {
  if (process.env.AI_ASSISTANT_PROVIDER === "gemini") {
    return new GeminiAiAssistant({
      project: requiredEnv("GOOGLE_CLOUD_PROJECT"),
      location: process.env.GOOGLE_CLOUD_LOCATION ?? "global",
      model: requiredEnv("GEMINI_MODEL"),
    });
  }

  if (process.env.AI_ASSISTANT_PROVIDER === "openai") {
    return new OpenAiAiAssistant({
      client: new OpenAI({ apiKey: requiredEnv("OPENAI_API_KEY") }),
      model: requiredEnv("OPENAI_MODEL"),
    });
  }

  return new DeterministicAiAssistant();
}
