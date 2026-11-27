# 设计：RSS 复活 · AI 策展阅读应用

## 概述

单体 Next.js 应用 + SQLite，三个核心模块：订阅与拉取、阅读列表、每日摘要。摘要模型可插拔、不可用时降级。

## 架构

```
页面（App Router）
  ├─ /            今日摘要
  ├─ /feeds       订阅管理 + OPML 导入导出
  └─ /articles    文章列表（默认未读）
        │
服务层（src/lib）
  ├─ db.ts     SQLite：feeds / articles / digests 三张表
  ├─ rss.ts    拉取 + 解析 + OPML
  └─ digest.ts 摘要生成 + 降级
        │
外部
  ├─ RSS 源（HTTP 拉取，10 秒超时）
  └─ LLM（环境变量配置，仅用于生成摘要要点）
```

## 数据模型

- `feeds`：id、url（唯一）、title、last_fetched_at、last_error
- `articles`：id、feed_id、guid（同源内唯一）、title、link、published_at、summary、is_read
- `digests`：id、date（每天一条）、content_json（每源要点 + Top 5）、created_at

## 关键流程

1. **拉取**：遍历 feeds → 逐个抓取（并发 ≤5，超时 10 秒）→ 按 guid 去重入库 → 更新 last_fetched_at / last_error
2. **摘要**：取当天新文章 → 每源挑最新 5 篇送模型提要点 → 再挑全天 Top 5 → 存入 digests（date = 当天）
3. **降级**：模型调用失败或未配置 → digest 记为“无摘要版”，页面直接用原文标题+摘要渲染

## 接口（Server Actions / Route Handlers）

- `addFeed(url)` / `removeFeed(id)` / `listFeeds()`
- `listArticles({ unreadOnly })` / `markRead(id)` / `markAllRead()`
- `getDigest(date)` / `refreshDigest()`
- `importOpml(file)` / `exportOpml()`

## 不做的事

- 无账号、无同步、无付费；不抓付费墙全文；密钥不进仓库
