import { createHash } from "node:crypto";
import pLimit from "p-limit";
import Parser from "rss-parser";
import { Builder, parseStringPromise, processors } from "xml2js";
import { hasFeed, insertFeed, listFeeds, saveFeedError, saveFeedRefresh, type Feed, type FeedArticle } from "./db";

type AtomFields = { id?: string; "rdf:about"?: string };
const parser = new Parser<Record<string, never>, AtomFields>({ defaultRSS: 2 });
const duplicateMessage = "这个订阅地址已存在。";
const limitFetch = pLimit(5);
const refreshInterval = 60 * 60 * 1000;
let activeRefresh: Promise<void> | undefined;

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function webUrl(value: string, base?: string) {
  if (!value) return null;
  try {
    const url = new URL(value, base);
    const supported = url.protocol === "http:" || url.protocol === "https:";
    return supported && !url.username && !url.password ? url : null;
  } catch {
    return null;
  }
}

function parseArticle(item: Parser.Item & AtomFields, base: string, fetchedAt: string): FeedArticle {
  const link = webUrl(text(item.link), base)?.href ?? null;
  const title = text(item.title) || "无标题文章";
  const summary = text(item.contentSnippet) || text(item.summary) || text(item.content);
  const date = Date.parse(text(item.isoDate) || text(item.pubDate));
  const publishedAt = Number.isNaN(date) ? null : new Date(date).toISOString();
  const guid = text(item.guid) || text(item.id) || text(item["rdf:about"]) || link ||
    createHash("sha256").update(JSON.stringify([title, publishedAt, summary])).digest("hex");

  return { guid, title, link, publishedAt: publishedAt ?? fetchedAt, summary };
}

class FeedError extends Error {}

async function fetchFeed(url: string) {
  const signal = AbortSignal.timeout(10_000);
  let response: Response;
  let xml: string;

  try {
    response = await fetch(url, {
      cache: "no-store",
      signal,
      headers: { Accept: "application/rss+xml, application/atom+xml, application/xml, text/xml, */*;q=0.1" },
    });
    if (!response.ok) {
      await response.body?.cancel();
      throw new FeedError(`订阅源返回 HTTP ${response.status}。`);
    }
    xml = await response.text();
  } catch (error) {
    if (error instanceof FeedError) throw error;
    throw new FeedError(signal.aborted ? "抓取订阅源超时（10 秒）。" : "无法连接订阅源，请检查地址和网络。");
  }

  try {
    const feed = await parser.parseString(xml);
    const fetchedAt = new Date().toISOString();
    return {
      title: text(feed.title) || new URL(url).hostname,
      fetchedAt,
      articles: feed.items.map((item) => parseArticle(item, response.url || url, fetchedAt)),
    };
  } catch {
    throw new FeedError("该地址没有返回可解析的 RSS 或 Atom 内容。");
  }
}

export type AddFeedResult = { ok: true; title: string } | { ok: false; message: string };

function normalizeFeedUrl(input: string) {
  const url = webUrl(input.trim());
  if (!url) return null;
  url.hash = "";
  return url.href;
}

export async function addFeed(input: string): Promise<AddFeedResult> {
  const url = normalizeFeedUrl(input);
  if (!url) {
    return { ok: false, message: "请输入有效的 HTTP 或 HTTPS 订阅地址，地址中不能包含账号或密码。" };
  }

  if (hasFeed(url)) return { ok: false, message: duplicateMessage };

  try {
    const content = await limitFetch(fetchFeed, url);
    return insertFeed(url, content)
      ? { ok: true, title: content.title }
      : { ok: false, message: duplicateMessage };
  } catch (error) {
    if (error instanceof FeedError) return { ok: false, message: error.message };
    throw error;
  }
}

async function refreshFeed(feed: Feed) {
  try {
    const content = await limitFetch(fetchFeed, feed.url);
    saveFeedRefresh(feed, content);
  } catch (error) {
    if (!(error instanceof FeedError)) throw error;
    saveFeedError(feed, error.message);
  }
}

export function refreshDueFeeds() {
  if (activeRefresh) return activeRefresh;

  const cutoff = new Date(Date.now() - refreshInterval).toISOString();
  const due = listFeeds().filter((feed) => !feed.last_fetched_at || feed.last_fetched_at < cutoff);
  activeRefresh = Promise.allSettled(due.map(refreshFeed)).then((results) => {
    for (const result of results) {
      if (result.status === "rejected") console.error("无法保存订阅拉取结果。", result.reason);
    }
  }).finally(() => {
    activeRefresh = undefined;
  });
  return activeRefresh;
}

type OpmlOutline = {
  $?: { title?: string; text?: string; xmlurl?: string; type?: string };
  outline?: OpmlOutline[];
};

type OpmlDocument = { opml?: { body?: Array<{ outline?: OpmlOutline[] } | string> } };
type OpmlEntry = { title: string; url: string };
export type OpmlResult = OpmlEntry & { ok: boolean; message: string };

export async function importOpml(file: File): Promise<{ message: string; results: OpmlResult[] }> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  let encoding = "utf-8";
  if (bytes[0] === 0xff && bytes[1] === 0xfe) encoding = "utf-16le";
  if (bytes[0] === 0xfe && bytes[1] === 0xff) encoding = "utf-16be";

  let document: OpmlDocument;
  try {
    const xml = new TextDecoder(encoding, { fatal: true }).decode(bytes);
    document = await parseStringPromise(xml, {
      attrNameProcessors: [processors.normalize],
      tagNameProcessors: [processors.normalize],
    });
  } catch {
    return { message: "文件无法解析，请选择有效的 OPML 文件。", results: [] };
  }

  const body = document?.opml?.body;
  if (body?.length !== 1) {
    return { message: "文件缺少有效的 OPML 订阅列表。", results: [] };
  }

  const entries: OpmlEntry[] = [];
  const stack = (typeof body[0] === "string" ? [] : body[0].outline ?? []).slice().reverse();
  while (stack.length) {
    const outline = stack.pop();
    if (!outline || typeof outline !== "object") continue;
    const attributes = outline.$;
    if (attributes && (attributes.xmlurl !== undefined || /^(rss|atom)$/i.test(attributes.type ?? ""))) {
      entries.push({
        title: text(attributes.title) || text(attributes.text),
        url: text(attributes.xmlurl),
      });
    }
    for (const child of (outline.outline ?? []).slice().reverse()) stack.push(child);
  }
  if (!entries.length) return { message: "这个 OPML 文件没有可导入的订阅。", results: [] };

  const attempts = new Map<string, Promise<AddFeedResult>>();
  const results = await Promise.all(entries.map(async (entry): Promise<OpmlResult> => {
    const url = normalizeFeedUrl(entry.url);
    const earlier = url ? attempts.get(url) : undefined;
    try {
      if (earlier) {
        const previous = await earlier;
        return { ...entry, ok: false, message: previous.ok ? duplicateMessage : previous.message };
      }

      const attempt = addFeed(entry.url);
      if (url) attempts.set(url, attempt);
      const result = await attempt;
      return result.ok
        ? { ...entry, title: result.title, ok: true, message: "已导入" }
        : { ...entry, ok: false, message: result.message };
    } catch (error) {
      if (!earlier) console.error("无法保存 OPML 订阅。", error);
      return { ...entry, ok: false, message: "无法保存这条订阅，请重试。" };
    }
  }));

  const succeeded = results.filter((result) => result.ok).length;
  return { message: `导入完成，成功 ${succeeded} 条，失败 ${results.length - succeeded} 条。`, results };
}

export function exportOpml() {
  const builder = new Builder({ headless: false, xmldec: { version: "1.0", encoding: "UTF-8" } });
  return builder.buildObject({
    opml: {
      $: { version: "2.0" },
      head: { title: "RSS 复活订阅" },
      body: {
        outline: listFeeds().map((feed) => ({
          $: { type: "rss", text: feed.title, title: feed.title, xmlUrl: feed.url },
        })),
      },
    },
  });
}
