import { createDb, type Db } from "../db/client.js";
import { UuidGenerator, SystemClock } from "../shared/index.js";
import {
  CreateAgentUseCase,
  DisableAgentUseCase,
  ListAgentsUseCase,
  SuggestListingFieldsUseCase,
  SuggestPriceUseCase,
  SuggestReviewUseCase,
} from "../modules/agents/index.js";
import {
  DrizzleAgentRepository,
  DeterministicAiAssistant,
} from "../modules/agents/infrastructure/index.js";
import {
  GetCurrentUserUseCase,
  UpsertCurrentUserUseCase,
} from "../modules/identity/index.js";
import { DrizzleUserRepository } from "../modules/identity/infrastructure/index.js";
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
} from "./workflows/index.js";
import {
  DrizzleHumanSignatureWorkflowTransaction,
  DrizzleMessageWorkflowTransaction,
  DrizzlePurchaseWorkflowTransaction,
  DrizzleReviewWorkflowTransaction,
} from "./workflows/infrastructure.js";

import { createApiApp } from "./create-app.js";

export function createProductionApp(db: Db = createDb()) {
  const idGenerator = new UuidGenerator();
  const clock = new SystemClock();
  const agentRepository = new DrizzleAgentRepository(db);
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

  // AI出品支援。MVPはLLM未接続の決定論fakeで配線する（AiAssistant port経由）。
  const aiAssistant = new DeterministicAiAssistant();
  const suggestListingFieldsUseCase = new SuggestListingFieldsUseCase({ aiAssistant });
  const suggestPriceUseCase = new SuggestPriceUseCase({ aiAssistant });
  const suggestReviewUseCase = new SuggestReviewUseCase({ aiAssistant });

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
  ];

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
    listingControllerDeps: {
      createListingUseCase,
      getListingUseCase: new GetListingUseCase({
        listingRepository,
      }),
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
      getCurrentUserUseCase: new GetCurrentUserUseCase({
        userRepository,
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
        transaction: messageWorkflowTransaction,
        orderFulfillmentService,
        listMessagesUseCase: new ListMessagesUseCase({
          messageRepository,
        }),
      }),
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
  });
}

function requiredEnv(name: string): string {
  const value = process.env[name];

  if (value === undefined || value.trim().length === 0) {
    throw new Error(`${name} is required.`);
  }

  return value;
}
