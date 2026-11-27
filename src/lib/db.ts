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

export function insertFeed(url: string, content: FeedContent) {
  const db = database();
  db.exec("BEGIN IMMEDIATE");

  try {
    const feed = db.prepare(`
      INSERT INTO feeds (url, title, last_fetched_at) VALUES (?, ?, ?)
      ON CONFLICT(url) DO NOTHING RETURNING id
    `).get(url, content.title, content.fetchedAt);

    if (feed) {
      const insertArticle = db.prepare(`
        INSERT INTO articles (feed_id, guid, title, link, published_at, summary)
        VALUES (?, ?, ?, ?, ?, ?)
        ON CONFLICT(feed_id, guid) DO NOTHING
      `);

      for (const article of content.articles) {
        insertArticle.run(feed.id, article.guid, article.title, article.link, article.publishedAt, article.summary);
      }
    }

    db.exec("COMMIT");
    return Boolean(feed);
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}

export function deleteFeed(id: number) {
  database().prepare("DELETE FROM feeds WHERE id = ?").run(id);
}
