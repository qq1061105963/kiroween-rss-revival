import type { Metadata } from "next";
import { connection } from "next/server";
import { listFeeds } from "../../lib/db";
import { removeFeedAction } from "./actions";
import { FeedForm } from "./feed-form";

export const metadata: Metadata = { title: "订阅管理" };

export default async function FeedsPage() {
  await connection();
  const feeds = listFeeds();

  return (
    <>
      <h1>订阅管理</h1>
      <div className="panel"><FeedForm /></div>
      <section className="list-section" aria-labelledby="feeds-heading">
        <div className="section-heading">
          <h2 id="feeds-heading">我的订阅</h2>
          <span className="muted">共 {feeds.length} 个</span>
        </div>
        {feeds.length === 0 ? (
          <p className="panel muted">还没有订阅。在上方添加一个 RSS 或 Atom 地址。</p>
        ) : (
          <ul className="entry-list">
            {feeds.map((feed) => (
              <li key={feed.id} className="entry entry-row">
                <div>
                  <h3>{feed.title}</h3>
                  <a className="entry-url" href={feed.url} target="_blank" rel="noopener noreferrer">{feed.url}</a>
                  {feed.last_error && <p className="feed-error error">拉取失败 · {feed.last_error}</p>}
                </div>
                <form action={removeFeedAction.bind(null, feed.id)}>
                  <button type="submit" className="secondary-button" aria-label={`删除订阅「${feed.title}」`}>删除</button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
