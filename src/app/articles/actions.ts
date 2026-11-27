"use server";

import { revalidatePath } from "next/cache";
import { markAllRead, markRead } from "../../lib/db";

export async function markReadAction(id: number) {
  if (!Number.isSafeInteger(id) || id < 1) return;
  markRead(id);
  revalidatePath("/articles");
}

export async function markAllReadAction(ids: number[]) {
  if (!Array.isArray(ids) || ids.some((id) => !Number.isSafeInteger(id) || id < 1)) return;
  markAllRead(ids);
  revalidatePath("/articles");
}
