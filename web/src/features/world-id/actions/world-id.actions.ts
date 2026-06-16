"use server";

import type { IDKitResult } from "@worldcoin/idkit";
import { revalidatePath } from "next/cache";

import { linkWorldId } from "../../../lib/api/world-id.api";
import { getWorldIdEnvironment } from "../../../lib/world/world-config";

export async function linkWorldIdAction(idKitResult: IDKitResult): Promise<void> {
  await linkWorldId({
    idKitResult,
    expectedEnvironment: getWorldIdEnvironment(),
  });
  revalidatePath("/me");
}
