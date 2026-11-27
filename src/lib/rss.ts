import { createHash } from "node:crypto";
import Parser from "rss-parser";
import { hasFeed, insertFeed, type FeedArticle } from "./db";

type AtomFields = { id?: string; "rdf:about"?: string };
const parser = new Parser<Record<string, never>, AtomFields>({ defaultRSS: 2 });
const duplicateMessage = "这个订阅地址已存在。";

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

export async function addFeed(input: string): Promise<AddFeedResult> {
  const url = webUrl(input.trim());
  if (!url) {
    return { ok: false, message: "请输入有效的 HTTP 或 HTTPS 订阅地址，地址中不能包含账号或密码。" };
  }

  url.hash = "";
  if (hasFeed(url.href)) return { ok: false, message: duplicateMessage };

  try {
    const content = await fetchFeed(url.href);
    return insertFeed(url.href, content)
      ? { ok: true, title: content.title }
      : { ok: false, message: duplicateMessage };
  } catch (error) {
    if (error instanceof FeedError) return { ok: false, message: error.message };
    throw error;
  }
}
