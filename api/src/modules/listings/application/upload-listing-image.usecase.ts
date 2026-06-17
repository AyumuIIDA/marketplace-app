import type { ListingImageStore, UploadedListingImage } from "./listing-image.port.js";

export type UploadListingImageInput = {
  bytes: Uint8Array;
};

export type UploadListingImageOutput = UploadedListingImage;

export type UploadListingImageDeps = {
  listingImageStore: ListingImageStore;
};

export class UploadListingImageUseCase {
  constructor(private readonly deps: UploadListingImageDeps) {}

  async execute(input: UploadListingImageInput): Promise<UploadListingImageOutput> {
    return this.deps.listingImageStore.upload(input.bytes);
  }
}
