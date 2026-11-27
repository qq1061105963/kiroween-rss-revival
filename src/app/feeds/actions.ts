"use server";

import { revalidatePath } from "next/cache";
import { deleteFeed } from "../../lib/db";
import { addFeed } from "../../lib/rss";

type FormState = { url: string; message: string; ok: boolean };

export async function addFeedAction(_previous: FormState, formData: FormData): Promise<FormState> {
  const input = formData.get("url");
  const url = typeof input === "string" ? input : "";
  const result = await addFeed(url);

  if (!result.ok) return { url, message: result.message, ok: false };
  revalidatePath("/feeds");
  return { url: "", message: `已添加订阅「${result.title}」。`, ok: true };
}

export async function removeFeedAction(id: number) {
  if (!Number.isSafeInteger(id) || id < 1) return;
  deleteFeed(id);
  revalidatePath("/feeds");
}
