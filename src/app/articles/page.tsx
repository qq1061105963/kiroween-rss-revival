import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { listArticles } from "../../lib/db";
import { refreshDueFeeds } from "../../lib/rss";
import { markAllReadAction } from "./actions";
import { ArticleLink } from "./article-link";

export const metadata: Metadata = { title: "文章" };
const dateFormat = new Intl.DateTimeFormat("zh-CN", { dateStyle: "medium", timeStyle: "short" });

export default async function ArticlesPage({ searchParams }: {
  searchParams: Promise<{ view?: string | string[] }>;
}) {
  await connection();
  const unreadOnly = (await searchParams).view !== "all";
  await refreshDueFeeds();
  const articles = listArticles({ unreadOnly });
  const unreadIds = articles.filter((article) => !article.is_read).map((article) => article.id);

  return (
    <>
      <h1>文章</h1>
      <div className="article-controls">
        <nav className="view-links" aria-label="筛选文章">
          <Link href="/articles" prefetch={false} aria-current={unreadOnly ? "page" : undefined}>未读</Link>
          <Link href="/articles?view=all" prefetch={false} aria-current={!unreadOnly ? "page" : undefined}>全部</Link>
        </nav>
        <form action={markAllReadAction.bind(null, unreadIds)}>
          <button type="submit" className="secondary-button" disabled={!unreadIds.length}>全部标为已读</button>
        </form>
      </div>
      {articles.length === 0 ? (
        <p className="panel muted">
          {unreadOnly ? "当前没有未读文章。" : "还没有文章。"}
          {" "}<Link href="/feeds">管理订阅</Link>
        </p>
      ) : (
        <ul className="entry-list">
          {articles.map((article) => (
            <li key={article.id} className="entry article-entry">
              <ArticleLink id={article.id} title={article.title} link={article.link} isRead={Boolean(article.is_read)} />
              <div className="article-meta muted">
                <span>{article.feed_title}</span>
                <time dateTime={article.published_at}>{dateFormat.format(new Date(article.published_at))}</time>
                {!unreadOnly && <span>{article.is_read ? "已读" : "未读"}</span>}
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
