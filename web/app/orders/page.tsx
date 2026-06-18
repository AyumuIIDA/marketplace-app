import { redirect } from "next/navigation";

// 注文一覧は「マイ」ページの注文履歴に統合した。旧URL/ブックマークは /me へ送る。
export default function OrdersPage() {
  redirect("/me");
}
