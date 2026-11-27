"use server";

import { revalidatePath } from "next/cache";
import { deleteFeed } from "../../lib/db";
import { addFeed, importOpml, type OpmlResult } from "../../lib/rss";

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

type OpmlState = { message: string; results: OpmlResult[] };

export async function importOpmlAction(_previous: OpmlState, formData: FormData): Promise<OpmlState> {
  const file = formData.get("opml");
  if (!(file instanceof File) || !file.size) {
    return { message: "请选择要导入的 OPML 文件。", results: [] };
  }
  if (file.size > 9 * 1024 * 1024) {
    return { message: "OPML 文件最大支持 9 MiB。", results: [] };
  }

  const result = await importOpml(file);
  if (result.results.some((entry) => entry.ok)) revalidatePath("/feeds");
  return result;
}
