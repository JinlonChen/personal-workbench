# 一页 · 个人工作台

一个本地优先的个人工作台 MVP，用于记录今日任务、工作、学习和每日复盘。

## 当前能力

- 今日工作台、任务、工作记录、学习记录和每日复盘
- 任务新增、编辑、完成、取消、删除和顺延
- 记录按日期、关键词和标签筛选
- JSON / Markdown 数据导出
- 浏览器 `localStorage` 持久化，无需云端账号即可运行
- Supabase PostgreSQL schema、索引、触发器和 RLS 策略

当前版本的数据只保存在当前浏览器中。部署到 Vercel 不会自动实现跨设备同步；跨设备同步需要后续接入 Supabase Repository 和认证流程。

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

## GitHub 与 Vercel 部署

1. 将本项目推送到 GitHub 私有仓库。
2. 在 Vercel 中导入该仓库，使用默认 Next.js 构建设置。
3. 部署后使用 Vercel 提供的网址访问。

不要提交 `.env.local`、服务密钥、`node_modules/` 或 `.next/`。环境变量模板见 `.env.example`。

## Supabase

生产 schema 位于 [`supabase/schema.sql`](./supabase/schema.sql)。当前页面仍使用本地仓库；接入 Supabase 时应增加远端 Repository、认证保护层和用户数据迁移流程。
