# Task Backlog Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a task-page backlog for unscheduled work and automatically move unfinished past-date tasks into a clearly marked “deployed but not executed” backlog state.

**Architecture:** Extend each task with a placement, backlog reason and optional original date while retaining the existing date field for compatibility. Pure domain helpers normalize old tasks, select each task class and perform idempotent expiration; the workspace provider calls the expiration helper when loaded data becomes available and when the task page opens. The task page renders two local tabs while Supabase preserves the same fields using an additive migration.

**Tech Stack:** Next.js 15 static export, React 19, TypeScript, Vitest, Testing Library, Supabase PostgreSQL, Lucide React, browser localStorage.

---

### Task 1: Add backlog task fields, normalization and domain selectors

**Files:**
- Modify: `src/domain/types.ts`
- Modify: `src/domain/selectors.ts`
- Modify: `src/data/seed.ts`
- Modify: `src/data/local-repository.ts`
- Test: `tests/domain.test.ts`
- Test: `tests/repository.test.ts`

- [ ] **Step 1: Write the failing domain and local migration tests**

Add a `task()` fixture with the new fields and assert that old task objects are normalized as ordinary scheduled tasks. Add selectors and expiration expectations:

```ts
expect(tasksForDate(tasks, "2026-08-13")).toEqual([scheduled]);
expect(backlogTasks(tasks)).toEqual([unscheduled, unexecuted]);
expect(expireTasks(tasks, "2026-08-13", now)).toContainEqual(expect.objectContaining({
  id: "past-task",
  placement: "backlog",
  backlogKind: "unexecuted",
  originalTaskDate: "2026-08-12",
}));

expect(normalized.tasks[0]).toMatchObject({
  placement: "scheduled",
  backlogKind: null,
  originalTaskDate: null,
});
```

- [ ] **Step 2: Run the focused tests and verify failure**

Run: `npm test -- --run tests/domain.test.ts tests/repository.test.ts`

Expected: FAIL because backlog fields and helpers do not exist.

- [ ] **Step 3: Add task placement types and pure helpers**

Define the following fields:

```ts
export type TaskPlacement = "scheduled" | "backlog";
export type TaskBacklogKind = "unscheduled" | "unexecuted" | null;

export interface WorkspaceTask {
  // existing fields
  placement: TaskPlacement;
  backlogKind: TaskBacklogKind;
  originalTaskDate: string | null;
}
```

Implement helpers that only return `placement === "scheduled"` records from `tasksForDate`, return active backlog records from `backlogTasks`, and convert only scheduled `todo`/`doing` tasks dated before `today` in `expireTasks`. Preserve the first `originalTaskDate`; never alter completed or cancelled tasks. Normalize missing fields in `LocalWorkspaceRepository` as `scheduled`, `null`, `null`, and extend seeds with ordinary scheduled values.

- [ ] **Step 4: Run the focused tests and verify success**

Run: `npm test -- --run tests/domain.test.ts tests/repository.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit the domain data layer**

```bash
git add src/domain/types.ts src/domain/selectors.ts src/data/seed.ts src/data/local-repository.ts tests/domain.test.ts tests/repository.test.ts
git commit -m "feat: add task backlog domain state"
```

### Task 2: Persist backlog fields through Supabase

**Files:**
- Modify: `src/data/supabase-repository.ts`
- Modify: `supabase/schema.sql`
- Create: `supabase/migrations/20260813_add_task_backlog.sql`
- Test: `tests/supabase-repository.test.ts`
- Test: `tests/schema.test.ts`

- [ ] **Step 1: Write failing repository and schema contract tests**

Add a scheduled and an unexecuted backlog task to a workspace round trip. Assert the generated row uses snake-case fields and restored data has the exact values:

```ts
expect(rows.tasks[0]).toMatchObject({
  placement: "backlog",
  backlog_kind: "unexecuted",
  original_task_date: "2026-08-12",
});
expect(rowsToWorkspace(rows).tasks[0]).toMatchObject({
  placement: "backlog",
  backlogKind: "unexecuted",
  originalTaskDate: "2026-08-12",
});
```

Extend the schema contract to require a `placement` check of `scheduled`/`backlog`, a nullable `backlog_kind` check, and a nullable `original_task_date` column.

- [ ] **Step 2: Run the focused tests and verify failure**

Run: `npm test -- --run tests/supabase-repository.test.ts tests/schema.test.ts`

Expected: FAIL because the rows and table columns do not exist.

- [ ] **Step 3: Add additive database and repository support**

Extend `TaskRow`, `workspaceToRows`, `rowsToWorkspace`, and the tasks `select()` projection. Existing database rows read as `scheduled`, `null`, `null` defensively.

Extend `supabase/schema.sql` task creation with:

```sql
placement text not null default 'scheduled' check (placement in ('scheduled', 'backlog')),
backlog_kind text check (backlog_kind in ('unscheduled', 'unexecuted')),
original_task_date date,
```

Create an idempotent `20260813_add_task_backlog.sql` migration that adds the three columns, checks and a `(user_id, placement, task_date)` index. Do not alter task RLS policies.

- [ ] **Step 4: Run focused tests and verify success**

Run: `npm test -- --run tests/supabase-repository.test.ts tests/schema.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit cloud persistence**

```bash
git add src/data/supabase-repository.ts supabase/schema.sql supabase/migrations/20260813_add_task_backlog.sql tests/supabase-repository.test.ts tests/schema.test.ts
git commit -m "feat: sync task backlog state"
```

### Task 3: Auto-transfer past scheduled tasks into the backlog

**Files:**
- Modify: `src/state/workspace-provider.tsx`
- Test: `tests/workbench.test.tsx`
- Test: `tests/domain.test.ts`

- [ ] **Step 1: Write failing provider-visible tests**

Seed an unfinished task dated yesterday, render the workbench, and assert it no longer appears in today or its old date view but appears in the backlog after opening the task page. Add cases asserting done and cancelled past tasks stay scheduled.

```ts
expect(screen.queryByText("昨天未完成任务")).not.toBeInTheDocument();
await user.click(screen.getByRole("button", { name: "任务" }));
await user.click(screen.getByRole("button", { name: "待办任务" }));
expect(screen.getByText("昨天未完成任务")).toBeInTheDocument();
expect(screen.getByText("已部署但未执行")).toBeInTheDocument();
expect(screen.getByText("原计划：8月12日")).toBeInTheDocument();
```

- [ ] **Step 2: Run the focused tests and verify failure**

Run: `npm test -- --run tests/workbench.test.tsx tests/domain.test.ts`

Expected: FAIL because the provider does not expire tasks or expose a backlog page.

- [ ] **Step 3: Add an idempotent provider expiration action**

Add `expirePastTasks()` to the workspace context. It calls `expireTasks(workspace.tasks, todayKey(workspace.profile.timezone))`, compares object identity/content before saving, and only calls `replaceWorkspace` when at least one task changed. Invoke it after local load, after cloud workspace hydration and once when the task page opens. Use a ref or equivalent guard so the same loaded workspace does not cause a save loop.

Keep manual `rollTaskToTomorrow()` as a scheduled task action by explicitly clearing `backlogKind` and `originalTaskDate` when it changes a date.

- [ ] **Step 4: Run focused tests and verify success**

Run: `npm test -- --run tests/workbench.test.tsx tests/domain.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit auto-transfer behavior**

```bash
git add src/state/workspace-provider.tsx tests/workbench.test.tsx tests/domain.test.ts
git commit -m "feat: move expired tasks to backlog"
```

### Task 4: Add task-page tabs, creation option and re-scheduling

**Files:**
- Modify: `src/features/tasks.tsx`
- Modify: `src/app/globals.css`
- Test: `tests/workbench.test.tsx`
- Test: `e2e/workbench.spec.ts`

- [ ] **Step 1: Write failing UI tests**

Add user-facing tests for the following flows:

```ts
await user.click(screen.getByRole("button", { name: "新建任务" }));
await user.click(screen.getByLabelText("创建为待办"));
await user.click(screen.getByRole("button", { name: "保存任务" }));
await user.click(screen.getByRole("button", { name: "待办任务" }));
expect(screen.getByText("待排期")).toBeInTheDocument();

await user.click(screen.getByRole("button", { name: "安排日期 待排期任务" }));
await user.type(screen.getByLabelText("安排到日期"), "2026-08-20");
await user.click(screen.getByRole("button", { name: "确认安排" }));
expect(screen.queryByText("待排期")).not.toBeInTheDocument();
```

Add E2E coverage that opens the task page, switches tabs, creates a backlog item, checks 390px mobile overflow, and verifies the control labels are visible.

- [ ] **Step 2: Run the focused UI tests and verify failure**

Run: `npm test -- --run tests/workbench.test.tsx`

Expected: FAIL because the task page has no backlog controls.

- [ ] **Step 3: Implement task-page workflows**

Keep the existing task page header and navigation. Add “日期任务” and “待办任务” tabs inside the task page. Extend `TaskForm` with a default-off `创建为待办` checkbox; when checked, hide/disable date input and submit:

```ts
{
  placement: "backlog",
  backlogKind: "unscheduled",
  originalTaskDate: null,
}
```

When editing an existing task, retain its placement by default. In the backlog tab, render two unframed groups: “尚未安排日期” and “已部署但未执行”. Display “待排期” for unscheduled items; display “已部署但未执行” and `原计划：${formatDate(originalTaskDate)}` for automatic transfers. Add an icon button with accessible name `安排日期 ${task.title}`; its compact modal accepts a date and invokes `updateTask` with a scheduled placement and clears both backlog fields.

Preserve checkbox completion, edit, cancel, deletion protection during a running Pomodoro and manual defer behavior. Do not show backlog tasks in date filters or today’s Pomodoro selector.

- [ ] **Step 4: Add responsive styling**

Add compact tabs and backlog markers using existing `segmented`, badge and task-row conventions. At 760px and below, tabs remain full-width and task metadata wraps below the title without horizontal overflow. Keep the six-item mobile main navigation unchanged.

- [ ] **Step 5: Run UI and E2E tests**

Run: `npm test -- --run tests/workbench.test.tsx`

Expected: PASS.

Run: `npm run test:e2e`

Expected: PASS for desktop and mobile once Playwright Chromium is available; otherwise record the browser download/environment blocker separately from application test results.

- [ ] **Step 6: Commit task UI**

```bash
git add src/features/tasks.tsx src/app/globals.css tests/workbench.test.tsx e2e/workbench.spec.ts
git commit -m "feat: add task backlog view"
```

### Task 5: Update docs and verify the complete demo

**Files:**
- Modify: `README.md`
- Modify: `docs/superpowers/specs/2026-08-13-task-backlog-design.md`
- Test: all existing tests

- [ ] **Step 1: Update user-facing behavior documentation**

Document task backlog categories, automatic transfer timing, manual defer distinction, and the fact that the Supabase migration must be executed before cloud users sync the new fields.

- [ ] **Step 2: Run full verification serially**

Run these commands serially so `next build` does not remove `.next/types` while TypeScript is reading them:

```bash
npm test -- --run
npm run lint
npm run build
npx tsc --noEmit
```

Expected: every command exits 0.

- [ ] **Step 3: Start the isolated demo and inspect it**

Run:

```bash
npm run dev -- --hostname 0.0.0.0 --port 3103
```

Manually inspect local mode at desktop and 390px: create a backlog task, inspect both groups, schedule an item, defer a scheduled task, and confirm the Pomodoro task picker contains only today’s scheduled work.

- [ ] **Step 4: Commit documentation**

```bash
git add README.md docs/superpowers/specs/2026-08-13-task-backlog-design.md
git commit -m "docs: explain task backlog workflow"
```

- [ ] **Step 5: Hand off only the local demo**

Report the demo URL and verification outcomes. Do not merge or push to GitHub until the user approves the demo. Before production release, run `supabase/migrations/20260813_add_task_backlog.sql` in Supabase SQL Editor, then merge and push the reviewed branch.
