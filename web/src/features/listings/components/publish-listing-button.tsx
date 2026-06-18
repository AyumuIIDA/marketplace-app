"use client";

import type { IDKitResult } from "@worldcoin/idkit";
import { useState } from "react";

import type { Listing } from "../../../lib/api/listings.api";
import { WorldIdButton } from "../../world-id/components/world-id-button";
import { computeListingSignal } from "../../world-id/signature-payload";
import { publishListingWithWorldIdAction } from "../actions/listing.actions";

type PublishListingButtonProps = {
  listing: Listing;
  label: string;
};

export function PublishListingButton({ label, listing }: PublishListingButtonProps) {
  const [signal, setSignal] = useState<string | undefined>();

  async function handleVerified(result: IDKitResult): Promise<void> {
    await publishListingWithWorldIdAction(listing.listingId, result);
  }

  async function prepareSignal(): Promise<string> {
    const nextSignal = await computeListingSignal(listing);
    setSignal(nextSignal);

    return nextSignal;
  }

  return (
    <WorldIdButton
      action="LISTING_PUBLISH"
      label={label}
      onBeforeOpen={prepareSignal}
      onVerified={handleVerified}
      signal={signal}
    />
  );
}
