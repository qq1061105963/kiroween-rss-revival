import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";

export type Feed = {
  id: number;
  url: string;
  title: string;
  last_fetched_at: string | null;
  last_error: string | null;
};

export type FeedArticle = {
  guid: string;
  title: string;
  link: string | null;
  publishedAt: string;
  summary: string;
};

type FeedContent = {
  title: string;
  fetchedAt: string;
  articles: FeedArticle[];
};

type Article = {
  id: number;
  title: string;
  link: string | null;
  published_at: string;
  is_read: 0 | 1;
  feed_title: string;
};

let connection: DatabaseSync | undefined;

function database() {
  if (connection) return connection;

  const directory = join(process.cwd(), "data");
  mkdirSync(directory, { recursive: true });
  const db = new DatabaseSync(join(directory, "app.db"));

  try {
    db.exec(`
      PRAGMA busy_timeout = 5000;
      PRAGMA journal_mode = WAL;
      PRAGMA foreign_keys = ON;

      CREATE TABLE IF NOT EXISTS feeds (
        id INTEGER PRIMARY KEY,
        url TEXT NOT NULL UNIQUE,
        title TEXT NOT NULL,
        last_fetched_at TEXT,
        last_error TEXT
      );

      CREATE TABLE IF NOT EXISTS articles (
        id INTEGER PRIMARY KEY,
        feed_id INTEGER NOT NULL REFERENCES feeds(id) ON DELETE CASCADE,
        guid TEXT NOT NULL,
        title TEXT NOT NULL,
        link TEXT,
        published_at TEXT NOT NULL,
        summary TEXT NOT NULL,
        is_read INTEGER NOT NULL DEFAULT 0 CHECK (is_read IN (0, 1)),
        UNIQUE (feed_id, guid)
      );

      CREATE TABLE IF NOT EXISTS digests (
        id INTEGER PRIMARY KEY,
        date TEXT NOT NULL UNIQUE,
        content_json TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS articles_published_at ON articles (published_at DESC, id DESC);
      CREATE INDEX IF NOT EXISTS articles_read_published_at ON articles (is_read, published_at DESC, id DESC);
    `);
  } catch (error) {
    db.close();
    throw error;
  }

  connection = db;
  return db;
}

export function listFeeds(): Feed[] {
  return database().prepare("SELECT * FROM feeds ORDER BY id DESC").all() as Feed[];
}

export function hasFeed(url: string) {
  return Boolean(database().prepare("SELECT id FROM feeds WHERE url = ?").get(url));
}

function writeTransaction<Value>(run: (db: DatabaseSync) => Value): Value {
  const db = database();
  db.exec("BEGIN IMMEDIATE");

  try {
    const result = run(db);
    db.exec("COMMIT");
    return result;
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}

function insertArticles(db: DatabaseSync, feedId: number, articles: FeedArticle[]) {
  const insertArticle = db.prepare(`
    INSERT INTO articles (feed_id, guid, title, link, published_at, summary)
    VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(feed_id, guid) DO NOTHING
  `);

  for (const article of articles) {
    insertArticle.run(feedId, article.guid, article.title, article.link, article.publishedAt, article.summary);
  }
}

export function insertFeed(url: string, content: FeedContent) {
  return writeTransaction((db) => {
    const feed = db.prepare(`
      INSERT INTO feeds (url, title, last_fetched_at) VALUES (?, ?, ?)
      ON CONFLICT(url) DO NOTHING RETURNING id
    `).get(url, content.title, content.fetchedAt);

    if (feed) insertArticles(db, Number(feed.id), content.articles);
    return Boolean(feed);
  });
}

export function deleteFeed(id: number) {
  database().prepare("DELETE FROM feeds WHERE id = ?").run(id);
}

export function saveFeedRefresh(feed: Feed, content: FeedContent) {
  writeTransaction((db) => {
    const result = db.prepare(`
      UPDATE feeds SET title = ?, last_fetched_at = ?, last_error = NULL
      WHERE id = ? AND url = ? AND last_fetched_at IS ?
    `).run(content.title, content.fetchedAt, feed.id, feed.url, feed.last_fetched_at);

    if (result.changes) insertArticles(db, feed.id, content.articles);
  });
}

export function saveFeedError(feed: Feed, message: string) {
  database().prepare(`
    UPDATE feeds SET last_fetched_at = ?, last_error = ?
    WHERE id = ? AND url = ? AND last_fetched_at IS ?
  `).run(new Date().toISOString(), message, feed.id, feed.url, feed.last_fetched_at);
}

export function listArticles({ unreadOnly }: { unreadOnly: boolean }): Article[] {
  const filter = unreadOnly ? "WHERE articles.is_read = 0" : "";
  return database().prepare(`
    SELECT articles.id, articles.title, articles.link, articles.published_at, articles.is_read,
           feeds.title AS feed_title
    FROM articles JOIN feeds ON articles.feed_id = feeds.id
    ${filter}
    ORDER BY articles.published_at DESC, articles.id DESC
  `).all() as Article[];
}

export function markRead(id: number) {
  database().prepare("UPDATE articles SET is_read = 1 WHERE id = ?").run(id);
}

export function markAllRead(ids: number[]) {
  database().prepare(`
    UPDATE articles SET is_read = 1
    WHERE is_read = 0 AND id IN (SELECT value FROM json_each(?))
  `).run(JSON.stringify(ids));
}
