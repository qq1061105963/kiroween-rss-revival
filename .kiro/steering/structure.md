# 仓库结构（Steering）

```
.
├── .kiro/
│   ├── steering/          # 产品 / 技术 / 结构说明（本目录）
│   └── specs/rss-revival/ # 需求 / 设计 / 任务
├── src/
│   ├── app/               # Next.js 页面：订阅列表、文章列表、今日摘要
│   ├── lib/
│   │   ├── db.ts          # SQLite 连接与建表
│   │   ├── rss.ts         # 拉取与解析 RSS / OPML
│   │   └── digest.ts      # 生成每日摘要（含降级逻辑）
│   └── components/        # 列表、卡片等 UI 组件
├── data/
│   └── app.db             # SQLite 文件（不进仓库，.gitignore）
├── .env.local.example     # 摘要模型配置示例（只留键名，不留真值）
└── README.md              # 怎么跑起来、怎么提交
```

## 规则

- `.kiro/` 必须在仓库根目录，这是 Devpost 提交的硬性要求
- `data/app.db` 与 `.env.local` 不提交
- 新增页面先在 `specs/rss-revival/tasks.md` 里对应任务打勾，再写代码
