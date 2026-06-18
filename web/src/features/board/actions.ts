"use server";

import { redirect } from "next/navigation";

import { addBoardReply, createBoardPost } from "../../lib/api/board.api";

// スレッド作成。投稿は humanVerified 必須（未検証は API が403→作成画面へ戻す）。
export async function createPostAction(formData: FormData): Promise<void> {
  const title = String(formData.get("title") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();
  if (title.length === 0 || body.length === 0) {
    redirect("/board/new?error=1");
  }
  let postId: string;
  try {
    const post = await createBoardPost({ title, body });
    postId = post.postId;
  } catch {
    redirect("/board/new?error=1");
  }
  redirect(`/board/${postId}`);
}

// レス投稿。返信後はスレッドへ戻る。
export async function addReplyAction(postId: string, formData: FormData): Promise<void> {
  const body = String(formData.get("body") ?? "").trim();
  if (body.length > 0) {
    await addBoardReply(postId, body);
  }
  redirect(`/board/${postId}`);
}
