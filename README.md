# 一页 · 个人工作台

一个本地优先的个人工作台 MVP，用于记录今日任务、工作、学习和每日复盘。

## 当前能力

- 今日工作台、任务、工作记录、学习记录和每日复盘
- 个人管理重点看板：项目摘要、负责人检查、风险和下一步管理动作
- 任务新增、编辑、完成、取消、删除和顺延
- 任务页提供“日期任务”和“待办任务”：未确定日期的事项可直接创建为“待排期”；已过执行日期但未完成的任务会在工作台下次运行时自动进入“已部署但未执行”，并保留原计划日期
- 今日工作台内置番茄钟：选择今日未完成任务，使用 15 / 25 / 45 / 60 分钟预设；支持暂停、继续、放弃，完成后手动确认才会计入任务专注时长
- 记录按日期、关键词和标签筛选
- JSON / Markdown 数据导出
- 浏览器 `localStorage` 持久化；配置 Supabase 后支持邮箱登录和跨设备同步
- Supabase PostgreSQL schema、索引、触发器和 RLS 策略

未配置 Supabase 时，数据只保存在当前浏览器中。配置后，登录同一邮箱的设备会使用 Supabase 云端数据。

### 番茄钟规则

- 计时中的任务不能删除；需要先完成并计入，或放弃当前番茄钟。
- 计时状态只保存在当前设备的浏览器中。刷新页面、关闭网页或锁屏后，会根据真实时间恢复；它不会在设备之间接续。
- 只有倒计时归零后点击“完成并计入”，本次专注才会写入工作台并同步到云端。主动放弃不会产生专注记录。
- 任务删除后，历史专注记录仍保留任务标题快照，但不再关联已删除的任务。

### 待办任务规则

- 新建任务默认安排到当天；勾选“创建为待办”后，任务不会占用任何日期。
- 每次工作台可运行时，过去日期中仍处于“未开始”或“进行中”的日期任务会自动转入待办，并标记为“已部署但未执行”。已完成和已取消的任务不会自动转入。
- 在待办页点击日历图标安排日期，任务会立即回到对应的日期任务，并清除待办标记和原计划日期。
- “顺延”是另一种操作：它会将未完成任务直接移到下一天，保持普通日期任务状态。
- 番茄钟只可选择今天的普通日期任务，不显示待办任务。

## 本地运行

要求：Node.js 20 或更高版本。

```bash
npm install
npm run dev
```

打开 [http://localhost:3000](http://localhost:3000)。如果需要让同一局域网内的手机访问：

```bash
npm run dev -- --hostname 0.0.0.0 --port 3100
```

## 检查命令

```bash
npm test -- --run
npm run lint
npx tsc --noEmit
npm run build
```

Playwright 测试位于 `e2e/`，需要先安装对应浏览器二进制：

```bash
npx playwright install chromium
npm run test:e2e
```

## GitHub 与 GitHub Pages 部署

1. 将本项目推送到 GitHub 仓库。
2. 确认 `.github/workflows/deploy-pages.yml` 已上传。
3. 在 GitHub 仓库的 `Settings` → `Pages` 中将发布来源设置为 `GitHub Actions`。
4. 在 `Settings` → `Secrets and variables` → `Actions` → `New repository secret` 中新增：
   - `NEXT_PUBLIC_SUPABASE_URL`：Supabase 的 Project URL；
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`：Supabase 的 anon/public 或 Publishable key。
5. 推送到 `main` 后，Actions 会构建 `out/` 并发布到 `https://<用户名>.github.io/<仓库名>/`。

不要提交 `.env.local`、服务密钥、`node_modules/` 或 `.next/`。环境变量模板见 `.env.example`。

## Supabase

生产 schema 位于 [`supabase/schema.sql`](./supabase/schema.sql)。`.env.local` 仅用于本地开发，已被 `.gitignore` 忽略；GitHub Pages 构建通过 Actions secrets 注入两个客户端配置。不要填写 `service_role` 或 secret key。

已部署过旧版 schema 的项目，需要按顺序在 Supabase SQL Editor 执行：

1. [`supabase/migrations/20260805_add_focus_projects.sql`](./supabase/migrations/20260805_add_focus_projects.sql)：增加重点关注项目表、索引、触发器和 RLS 策略；
2. [`supabase/migrations/20260813_add_focus_sessions.sql`](./supabase/migrations/20260813_add_focus_sessions.sql)：增加番茄钟完成记录表、索引、触发器和 RLS 策略。
3. [`supabase/migrations/20260813_add_task_backlog.sql`](./supabase/migrations/20260813_add_task_backlog.sql)：增加待办任务归类、自动转入标记和原计划日期字段。

迁移脚本使用幂等创建语句，重复执行不会重复创建已有表、触发器或策略。
