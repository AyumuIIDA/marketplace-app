import { Hono } from "hono";

import { getCurrentUser } from "../../../interface/http/index.js";
import { NotFoundError, ValidationAppError, parseUuid } from "../../../shared/index.js";
import type {
  CreateListingUseCase,
  GetListingUseCase,
  HideListingUseCase,
  SearchListingsUseCase,
  UpdateDraftListingUseCase,
  UploadListingImageUseCase,
} from "../application/index.js";
import type {
  PublishListingWithHumanSignatureOperation,
  PurchaseItemOperation,
  UpdateListingWithHumanSignatureOperation,
} from "../../../app/workflows/index.js";

import {
  createListingRequestSchema,
  listingSearchQuerySchema,
  purchaseListingRequestSchema,
  publishListingRequestSchema,
  updateDraftListingRequestSchema,
  updateListingRequestSchema,
} from "./listing.dto.js";

export type ListingControllerDeps = {
  createListingUseCase: CreateListingUseCase;
  uploadListingImageUseCase: UploadListingImageUseCase;
  getListingUseCase: GetListingUseCase;
  searchListingsUseCase: SearchListingsUseCase;
  updateDraftListingUseCase: UpdateDraftListingUseCase;
  hideListingUseCase: HideListingUseCase;
  publishListingWithHumanSignatureWorkflow: PublishListingWithHumanSignatureOperation;
  updateListingWithHumanSignatureWorkflow: UpdateListingWithHumanSignatureOperation;
  purchaseItemWorkflow: PurchaseItemOperation;
};

// アップロード上限（15MB）。sharpで縮小する前段の受け入れ上限。
const MAX_IMAGE_BYTES = 15 * 1024 * 1024;

export function createListingController(deps: ListingControllerDeps): Hono {
  const app = new Hono();

  app.post("/", async (c) => {
    const currentUser = getCurrentUser(c);
    const body = createListingRequestSchema.parse(await c.req.json());
    const output = await deps.createListingUseCase.execute({
      sellerId: currentUser.userId,
      agentId: body.agentId,
      title: body.title,
      description: body.description,
      price: body.price,
      currency: body.currency,
      category: body.category,
      condition: body.condition,
      images: body.images,
    });

    return c.json(output, 201);
  });

  // 画像アップロード（multipart）。出品作成前に先行アップロードし、戻りの{url,hash}を
  // 作成リクエストやAI提案に渡す。商品画像の公開配信はstorage直（BFF非経由）だが、
  // アップロード経路はBFF→API→ObjectStorageで認証保護する。
  app.post("/images", async (c) => {
    getCurrentUser(c);
    const form = await c.req.formData();
    const file = form.get("file");

    if (!(file instanceof File)) {
      throw new ValidationAppError("Image file is required.", { field: "file" });
    }

    if (file.size > MAX_IMAGE_BYTES) {
      throw new ValidationAppError("Image file is too large.", { maxBytes: MAX_IMAGE_BYTES });
    }

    const bytes = new Uint8Array(await file.arrayBuffer());
    const output = await deps.uploadListingImageUseCase.execute({ bytes });

    return c.json(output, 201);
  });

  app.get("/", async (c) => {
    const currentUser = getCurrentUser(c);
    const query = listingSearchQuerySchema.parse({
      keyword: c.req.query("keyword"),
      category: c.req.query("category"),
      minPrice: c.req.query("minPrice"),
      maxPrice: c.req.query("maxPrice"),
      condition: c.req.query("condition"),
      mine: c.req.query("mine"),
      limit: c.req.query("limit"),
    });
    const output = await deps.searchListingsUseCase.execute({
      keyword: query.keyword,
      category: query.category,
      minPrice: query.minPrice,
      maxPrice: query.maxPrice,
      condition: query.condition,
      sellerId: query.mine === true ? currentUser.userId : undefined,
      includeDraftsForSeller: query.mine === true,
      limit: query.limit,
    });

    return c.json(output, 200);
  });

  app.get("/:listingId", async (c) => {
    const currentUser = getCurrentUser(c);
    const raw = c.req.param("listingId");
    const listingId = parseUuid(raw);

    if (listingId === undefined) {
      // 非uuidは如何なるリソースにも対応し得ない → 404（存在しないidと同義）。
      throw new NotFoundError("Listing", raw);
    }

    const output = await deps.getListingUseCase.execute({
      listingId,
      requesterId: currentUser.userId,
    });

    return c.json(output, 200);
  });

  app.post("/:listingId/publish", async (c) => {
    const currentUser = getCurrentUser(c);
    const listingId = c.req.param("listingId");
    const body = publishListingRequestSchema.parse(await c.req.json());
    const output = await deps.publishListingWithHumanSignatureWorkflow.execute({
      listingId,
      sellerId: currentUser.userId,
      idKitResult: body.idKitResult,
      expectedEnvironment: body.expectedEnvironment,
    });

    return c.json(output, 200);
  });

  app.patch("/:listingId", async (c) => {
    const currentUser = getCurrentUser(c);
    const listingId = c.req.param("listingId");
    const body = updateListingRequestSchema.parse(await c.req.json());
    const output = await deps.updateListingWithHumanSignatureWorkflow.execute({
      listingId,
      sellerId: currentUser.userId,
      fields: {
        ...body.fields,
        currency: body.fields.currency ?? "JPY",
      },
      idKitResult: body.idKitResult,
      expectedEnvironment: body.expectedEnvironment,
    });

    return c.json(output, 200);
  });

  app.patch("/:listingId/draft", async (c) => {
    const currentUser = getCurrentUser(c);
    const listingId = c.req.param("listingId");
    const body = updateDraftListingRequestSchema.parse(await c.req.json());
    const output = await deps.updateDraftListingUseCase.execute({
      listingId,
      sellerId: currentUser.userId,
      fields: {
        ...body.fields,
        currency: body.fields.currency ?? "JPY",
      },
    });

    return c.json(output, 200);
  });

  app.post("/:listingId/hide", async (c) => {
    const currentUser = getCurrentUser(c);
    const listingId = c.req.param("listingId");
    const output = await deps.hideListingUseCase.execute({
      listingId,
      sellerId: currentUser.userId,
    });

    return c.json(output, 200);
  });

  app.post("/:listingId/purchase", async (c) => {
    const currentUser = getCurrentUser(c);
    const listingId = c.req.param("listingId");
    const body = purchaseListingRequestSchema.parse(await c.req.json());
    const output = await deps.purchaseItemWorkflow.execute({
      listingId,
      buyerId: currentUser.userId,
      confirmed: body.confirmed,
    });

    return c.json(output, output.status === "PAID" ? 201 : 200);
  });

  return app;
}
