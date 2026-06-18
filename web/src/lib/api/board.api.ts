import { bffJson, isBffError } from "./bff-client";

// 掲示板（2ch風）。著者表示情報は API が join 済みで返す。
export type BoardPostListItem = {
  postId: string;
  authorId: string;
  authorName: string;
  authorAvatarUrl?: string | null;
  authorVerified: boolean;
  title: string;
  body: string;
  createdAt: string;
  replyCount: number;
};

export type BoardReply = {
  replyId: string;
  authorId: string;
  authorName: string;
  authorAvatarUrl?: string | null;
  authorVerified: boolean;
  body: string;
  createdAt: string;
};

export type BoardPostDetail = {
  postId: string;
  authorId: string;
  authorName: string;
  authorAvatarUrl?: string | null;
  authorVerified: boolean;
  title: string;
  body: string;
  createdAt: string;
  replies: BoardReply[];
};

export async function listBoardPosts(): Promise<BoardPostListItem[]> {
  try {
    return (await bffJson<{ items: BoardPostListItem[] }>("/board")).items;
  } catch (error) {
    if (isBffError(error) && error.status === 401) {
      return [];
    }
    throw error;
  }
}

export async function getBoardPost(postId: string): Promise<BoardPostDetail | undefined> {
  try {
    return await bffJson<BoardPostDetail>(`/board/${postId}`);
  } catch (error) {
    if (isBffError(error) && (error.status === 401 || error.status === 404)) {
      return undefined;
    }
    throw error;
  }
}

export async function createBoardPost(input: { title: string; body: string }): Promise<BoardPostListItem> {
  return bffJson<BoardPostListItem>("/board", { method: "POST", body: input });
}

export async function addBoardReply(postId: string, body: string): Promise<BoardReply> {
  return bffJson<BoardReply>(`/board/${postId}/replies`, { method: "POST", body: { body } });
}
