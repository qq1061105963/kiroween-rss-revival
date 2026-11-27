# Kiroween 2026 · RSS 复活项目 /.kiro 起手包（草稿）

整理时间：2026-11-23（北京时间）。依据：用户 2026-10-31 在 Credits 申请表里确认的计划句——把经典 RSS 阅读器复活为现代 AI 策展阅读应用，用 Kiro 搭建，把被冷落的 RSS 源变成个性化摘要（LLM 摘要）；赛道 Resurrection；提交清单见同目录 `../Kiroween-提交清单.md`。

## 这是什么

一个可直接放进公开 GitHub 仓库根目录的 `.kiro` 目录草稿，同时满足 Devpost 的硬性要求：**公开仓库根目录必须包含 `/.kiro` 目录，没有就过不了提交**（2026-11-12 Devpost 邮件）。

## 怎么用

1. 在 GitHub 新建公开仓库（或用已有仓库），把本目录下的 `.kiro/` 整个复制到仓库根目录。
2. 用 Kiro 打开该仓库，按 `tasks.md` 的顺序让 Kiro 做：先跑任务 1–3 出最小可用版本，再做 4–6。
3. 技术栈是草稿里的默认建议（Next.js + TypeScript + SQLite，见 `tech.md`），不合适直接改 `tech.md` 再让 Kiro 按新栈重做 tasks。

## 包含的文件

- `.kiro/steering/product.md`——产品定位：复活什么、给谁用、做到什么算成
- `.kiro/steering/tech.md`——默认技术栈与硬性约束（中文界面、本地优先、摘要模型走环境变量配置，不写死密钥）
- `.kiro/steering/structure.md`——仓库目录结构
- `.kiro/specs/rss-revival/requirements.md`——需求（EARS 写法，可验收）
- `.kiro/specs/rss-revival/design.md`——设计（模块、数据、接口）
- `.kiro/specs/rss-revival/tasks.md`——任务清单（按顺序执行，每步可验收）

## 截止时间

- 提交截止：**2026-12-04 14:00 美西时间（PT）= 北京时间 2026-12-05 06:00**，还剩 11 天（以 2026-11-23 计）。
- 4,000 credits 已到账，**2026-12-31 过期**。
- 队伍最多 3 人（可选）。

## 还缺什么（需用户定）

- 项目仓库地址：目前没有记录，清单备注也是“仓库地址确认后可再补一版对照检查”。
- 技术栈是否接受默认（Next.js + TypeScript + SQLite），还是换别的。
- 摘要用的模型/API：credits 是 Kiro 账号内的额度，代码里只留环境变量接口，不代填任何密钥。
