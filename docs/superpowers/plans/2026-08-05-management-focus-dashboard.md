# 个人管理重点看板 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在保留现有个人工作台结构和逻辑的基础上，增加可持久化、可同步的个人管理重点看板。

**Architecture:** 新增独立的 `FocusProject` 数据集合与 `FocusView` 页面，负责人检查从项目集合派生，“我的管理动作”复用现有任务。现有本地仓库和 Supabase 全量工作区同步仅增加一个集合及一张表，不改变认证、任务或记录流程。

**Tech Stack:** Next.js 15、React 19、TypeScript、Vitest、Testing Library、Supabase PostgreSQL、CSS

---

### Task 1: 增加重点项目领域模型与本地兼容

**Files:**
- Modify: `src/domain/types.ts`
- Modify: `src/data/seed.ts`
- Modify: `src/data/local-repository.ts`
- Modify: `src/domain/export.ts`
- Test: `tests/repository.test.ts`
- Test: `tests/domain.test.ts`

- [ ] **Step 1: 写入旧数据迁移与导出的失败测试**

在 `tests/repository.test.ts` 的旧数据测试中增加：

```ts
expect(workspace.focusProjects).toEqual([]);
```

在 `tests/domain.test.ts` 的测试工作区中增加一个重点项目，并断言：

```ts
expect(exportMarkdown(workspace)).toContain("## 重点关注");
expect(exportMarkdown(workspace)).toContain("新型破碎主机开发");
```

- [ ] **Step 2: 运行测试并确认因字段或导出章节缺失而失败**

Run: `npm test -- --run tests/repository.test.ts tests/domain.test.ts`

Expected: FAIL，提示 `focusProjects` 或“重点关注”章节不存在。

- [ ] **Step 3: 增加领域类型和兼容逻辑**

在 `src/domain/types.ts` 增加：

```ts
export type FocusProjectStatus = "on_track" | "attention" | "blocked";
export type FocusProjectTier = "top" | "parallel" | "paused";

export interface FocusProject {
  id: string;
  name: string;
  platformUrl: string;
  owner: string;
  tier: FocusProjectTier;
  status: FocusProjectStatus;
  currentGoal: string;
  risk: string;
  nextAction: string;
  latestConclusion: string;
  nextReviewDate: string;
  createdAt: string;
  updatedAt: string;
}

export type FocusProjectInput = Omit<FocusProject, "id" | "createdAt" | "updatedAt">;
```

向 `Workspace` 增加 `focusProjects: FocusProject[]`；种子工作区使用空数组；本地旧数据使用：

```ts
focusProjects: Array.isArray(value.focusProjects) ? value.focusProjects : [],
```

Markdown 导出增加项目名称、负责人、状态、当前目标、风险和下一步。

- [ ] **Step 4: 运行相关测试并确认通过**

Run: `npm test -- --run tests/repository.test.ts tests/domain.test.ts`

Expected: 两个测试文件全部通过。

### Task 2: 增加 Supabase 同步与数据库迁移

**Files:**
- Modify: `src/data/supabase-repository.ts`
- Modify: `supabase/schema.sql`
- Create: `supabase/migrations/20260805_add_focus_projects.sql`
- Test: `tests/supabase-repository.test.ts`
- Test: `tests/schema.test.ts`

- [ ] **Step 1: 写入映射和数据库结构失败测试**

在映射测试中加入重点项目并断言：

```ts
expect(rows.focusProjects[0]).toMatchObject({
  user_id: "user-1",
  name: "新型破碎主机开发",
  status: "attention",
});
expect(rowsToWorkspace(rows).focusProjects).toEqual(workspace.focusProjects);
```

在 schema 测试中断言 `focus_projects` 建表、RLS、四种策略、触发器和用户/检查日期索引存在。

- [ ] **Step 2: 运行测试并确认新表和映射缺失**

Run: `npm test -- --run tests/supabase-repository.test.ts tests/schema.test.ts`

Expected: FAIL，提示 `focusProjects` 或 `focus_projects` 不存在。

- [ ] **Step 3: 实现行映射和同步**

新增 `FocusProjectRow`，字段使用 snake_case；`SupabaseRows` 增加 `focusProjects`；`workspaceToRows` 和 `rowsToWorkspace` 完成双向映射。云端 `loadOnce()` 并行读取：

```ts
this.client
  .from("focus_projects")
  .select("id, user_id, name, platform_url, owner, tier, status, current_goal, risk, next_action, latest_conclusion, next_review_date, created_at, updated_at")
  .eq("user_id", this.userId)
  .order("next_review_date", { ascending: true });
```

将 `focus_projects` 加入 `TableName`、保存同步和清空顺序。

- [ ] **Step 4: 编写可重复执行的增量迁移**

`supabase/migrations/20260805_add_focus_projects.sql` 使用 `create table if not exists` 创建字段和约束，启用 RLS，并在创建策略前检查 `pg_policies`，确保脚本重复执行不会报错。`supabase/schema.sql` 同步包含新表的完整定义。

- [ ] **Step 5: 运行相关测试并确认通过**

Run: `npm test -- --run tests/supabase-repository.test.ts tests/schema.test.ts`

Expected: 两个测试文件全部通过，并且 401 重试测试的 `from` 调用次数更新为 12。

### Task 3: 增加工作区操作与重点关注页面

**Files:**
- Create: `src/features/focus.tsx`
- Modify: `src/state/workspace-provider.tsx`
- Modify: `src/components/app-shell.tsx`
- Modify: `src/app/globals.css`
- Test: `tests/workbench.test.tsx`

- [ ] **Step 1: 写入页面操作失败测试**

测试依次完成：进入“关注”、看到空状态、新建项目、编辑项目、把“我的下一步”加入今日任务、确认后删除项目。关键断言包括：

```ts
await user.click(screen.getByRole("button", { name: "关注" }));
expect(screen.getByRole("heading", { name: "重点关注" })).toBeInTheDocument();
await user.click(screen.getByRole("button", { name: "新增关注项目" }));
await user.type(screen.getByLabelText("项目名称"), "新型破碎主机开发");
await user.type(screen.getByLabelText("负责人"), "张工");
await user.type(screen.getByLabelText("我的下一步"), "协调试验台排期");
await user.click(screen.getByRole("button", { name: "保存项目" }));
expect(await screen.findByText("新型破碎主机开发")).toBeInTheDocument();
```

- [ ] **Step 2: 运行页面测试并确认导航和页面缺失**

Run: `npm test -- --run tests/workbench.test.tsx`

Expected: FAIL，无法找到“关注”按钮。

- [ ] **Step 3: 增加工作区 CRUD 方法**

`WorkspaceContextValue` 增加：

```ts
createFocusProject(input: FocusProjectInput): Promise<void>;
updateFocusProject(id: string, patch: FocusProjectInput): Promise<void>;
deleteFocusProject(id: string): Promise<void>;
```

方法复用 `replaceWorkspace`、`createId()` 和时间戳，不改变其他集合。

- [ ] **Step 4: 实现页面与导航**

新增 `FocusView`，包含：统计摘要、项目卡片、今日未完成任务、按负责人派生的检查列表、项目表单和删除确认。项目表单校验名称、负责人；非空平台链接必须以 `http://` 或 `https://` 开头。“加入今日任务”调用：

```ts
createTask({
  title: project.nextAction,
  description: `关联重点项目：${project.name}`,
  taskDate: todayKey(workspace.profile.timezone),
  priority: project.tier === "top" ? "high" : "medium",
  status: "todo",
});
```

`AppShell` 增加一个“关注”导航项，原有页面顺序和组件内部逻辑保持不变。

- [ ] **Step 5: 增加响应式样式并运行测试**

样式使用现有颜色变量、按钮、弹窗和页面宽度；桌面端采用主列表加侧栏，窄屏改为单列，项目元信息在手机端改为一列。

Run: `npm test -- --run tests/workbench.test.tsx`

Expected: 页面新增、编辑、加入任务和删除流程全部通过，原有页面测试仍通过。

### Task 4: 完整验证、数据库发布和 GitHub 发布

**Files:**
- Modify: `README.md`
- Modify: `.gitignore`

- [ ] **Step 1: 更新说明且保护私人计划文件**

README 的当前能力增加“个人管理重点看板”；Supabase 章节说明现有项目需要执行 `supabase/migrations/20260805_add_focus_projects.sql`。`.gitignore` 明确忽略 `个人工作与生活重建指导计划.md`。

- [ ] **Step 2: 运行完整验证**

Run: `npm test -- --run`

Expected: 所有测试通过，0 failures。

Run: `npm run lint`

Expected: exit 0，无 ESLint errors。

Run: `npx tsc --noEmit`

Expected: exit 0，无 TypeScript errors。

Run: `npm run build`

Expected: exit 0，GitHub Pages 静态导出成功。

- [ ] **Step 3: 执行数据库增量迁移**

在 Supabase 项目的 SQL Editor 中执行 `supabase/migrations/20260805_add_focus_projects.sql`，然后确认 Table Editor 中存在 `focus_projects` 且已启用 RLS。

- [ ] **Step 4: 提交并推送**

确认 `git status --short` 不包含私人指导计划正文或 `.env.local`，提交功能代码并执行：

```bash
git push origin main
```

Expected: GitHub 接受 `main` 推送，Actions 开始构建并发布 Pages。

- [ ] **Step 5: 验证线上版本**

打开 `https://jinlongchen.github.io/personal-workbench/`，确认验证码登录、重点关注页面、项目保存及另一设备同步正常。
