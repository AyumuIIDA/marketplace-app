"use client";

import { MiniKit } from "@worldcoin/minikit-js";
import { useEffect } from "react";

import { getWorldAppId } from "../../lib/world/world-config";

export function WorldMiniKitProvider() {
  useEffect(() => {
    MiniKit.install(getWorldAppId());
  }, []);

  return null;
}
