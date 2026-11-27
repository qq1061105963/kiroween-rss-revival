# 技术栈与约束（Steering）

## 默认栈（可改，改完同步改 specs）

- 前端 + 后端：Next.js（App Router）+ TypeScript，单仓库单应用
- 数据：SQLite（本地文件），不用另起数据库服务
- RSS 解析：`rss-parser`；OPML 解析用轻量 XML 解析
- 摘要：LLM 调用只走环境变量（`LLM_API_BASE_URL` / `LLM_API_KEY` / `LLM_MODEL`），密钥绝不进仓库

## 硬性约束

- 界面中文；所有面向用户的文案写中文，代码注释也可中文
- 敏感信息（密钥、Token）只放 `.env.local`，`.gitignore` 必须包含它
- 拉取 RSS 要设超时（10 秒）与并发上限，避免一个坏源拖垮整批
- 每天摘要可离线降级：模型不可用时照常出“无摘要版”列表

## 开发方式

- 用 Kiro 的 spec-driven 流程：先 requirements，再 design，最后按 tasks.md 一步步实现，每步跑通再下一步
- 每完成一个 task 就跑一次 `npm run build`（或对应检查命令），不过不进入下一步
