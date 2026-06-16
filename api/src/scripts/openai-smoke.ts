import "dotenv/config";
import OpenAI from "openai";

import { OpenAiAiAssistant } from "../modules/ai-assistance/infrastructure/index.js";

// OpenAI実接続のsmoke。OPENAI_API_KEY / OPENAI_MODEL 設定時のみ実行する。
//   npm run ai:smoke
// AiAssistant portの全メソッドを1回ずつ叩き、structured outputが返るかを確認する。
async function main(): Promise<void> {
  const apiKey = process.env.OPENAI_API_KEY;
  const model = process.env.OPENAI_MODEL;

  if (apiKey === undefined || apiKey.trim().length === 0 || model === undefined || model.trim().length === 0) {
    throw new Error("OPENAI_API_KEY と OPENAI_MODEL を設定してください（.env で可）。");
  }

  const assistant = new OpenAiAiAssistant({ client: new OpenAI({ apiKey }), model });

  console.log(`[ai:smoke] model=${model}`);

  const price = await assistant.suggestPrice({
    title: "中古スニーカー",
    category: "fashion_shoes",
    condition: "good",
  });
  console.log("[suggestPrice]", price);

  const message = await assistant.suggestMessage({
    orderId: "order-smoke",
    intent: "発送予定日を確認したい",
    tone: "polite",
  });
  console.log("[suggestMessage]", message);

  const comparison = await assistant.compareListings({
    listings: [
      {
        listingId: "listing-1",
        title: "ワイヤレスイヤホン A",
        description: "美品",
        price: 8000,
        currency: "JPY",
        condition: "good",
        category: "electronics",
      },
      {
        listingId: "listing-2",
        title: "ワイヤレスイヤホン B",
        description: "新品同様",
        price: 12000,
        currency: "JPY",
        condition: "new",
        category: "electronics",
      },
    ],
  });
  console.log("[compareListings]", JSON.stringify(comparison, null, 2));

  console.log("[ai:smoke] OK");
}

main().catch((error: unknown) => {
  console.error("[ai:smoke] FAILED", error);
  process.exitCode = 1;
});
