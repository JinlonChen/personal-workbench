# Personal Workbench MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a polished, responsive personal workbench that runs without cloud credentials, persists data locally, exports user data, and includes a production-ready Supabase schema for later synchronization.

**Architecture:** A Next.js App Router application keeps domain types and pure selectors separate from a versioned `WorkspaceRepository`. A client-side provider owns mutations and persistence, while focused page components consume the provider without touching browser storage. Supabase SQL mirrors the local data model and enforces per-user RLS.

**Tech Stack:** Next.js 15, React 19, TypeScript, Tailwind CSS 4, Lucide React, Vitest, Testing Library, Playwright

---

## File Map

- `package.json`, `tsconfig.json`, `next.config.ts`, `postcss.config.mjs`, `vitest.config.ts`: project and test configuration.
- `src/app/layout.tsx`, `src/app/page.tsx`, `src/app/globals.css`: application entry point and design system.
- `src/domain/types.ts`: canonical business entity and input types.
- `src/domain/date.ts`, `src/domain/selectors.ts`, `src/domain/export.ts`: pure date, filtering, metric, and export behavior.
- `src/data/repository.ts`, `src/data/local-repository.ts`, `src/data/seed.ts`: persistence boundary, local implementation, and first-run sample data.
- `src/state/workspace-provider.tsx`: application state, mutations, save status, and repository coordination.
- `src/components/app-shell.tsx`, `src/components/ui.tsx`: responsive navigation and shared controls.
- `src/features/today.tsx`, `src/features/tasks.tsx`, `src/features/records.tsx`, `src/features/reviews.tsx`, `src/features/settings.tsx`: feature views and forms.
- `supabase/schema.sql`: tables, constraints, timestamps, indexes, and RLS policies.
- `tests/domain.test.ts`, `tests/repository.test.ts`, `tests/workbench.test.tsx`, `e2e/workbench.spec.ts`: automated coverage.

### Task 1: Scaffold the tested Next.js application

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `next.config.ts`
- Create: `postcss.config.mjs`
- Create: `vitest.config.ts`
- Create: `src/app/layout.tsx`
- Create: `src/app/page.tsx`
- Create: `src/app/globals.css`
- Test: `tests/smoke.test.tsx`

- [ ] **Step 1: Add the failing smoke test**

```tsx
import { render, screen } from "@testing-library/react";
import Home from "@/app/page";

it("renders the personal workbench", () => {
  render(<Home />);
  expect(screen.getByText("今日工作台")).toBeInTheDocument();
});
```

- [ ] **Step 2: Install dependencies and verify the test fails**

Run: `npm install && npm test -- --run tests/smoke.test.tsx`
Expected: FAIL because the application entry point does not exist yet.

- [ ] **Step 3: Add configuration, the root layout, global design tokens, and a minimal page**

The page must render `<main><h1>今日工作台</h1></main>`. Configure the `@/*` alias to `src/*`, jsdom test environment, Testing Library setup, and scripts for `dev`, `build`, `lint`, `test`, and `test:e2e`.

- [ ] **Step 4: Run the smoke test**

Run: `npm test -- --run tests/smoke.test.tsx`
Expected: PASS.

### Task 2: Define domain behavior and local persistence

**Files:**
- Create: `src/domain/types.ts`
- Create: `src/domain/date.ts`
- Create: `src/domain/selectors.ts`
- Create: `src/domain/export.ts`
- Create: `src/data/repository.ts`
- Create: `src/data/local-repository.ts`
- Create: `src/data/seed.ts`
- Test: `tests/domain.test.ts`
- Test: `tests/repository.test.ts`

- [ ] **Step 1: Write failing domain tests**

```ts
it("filters today's tasks and calculates completion", () => {
  expect(todayTasks(workspace.tasks, "2026-07-27")).toHaveLength(2);
  expect(completionRate(workspace.tasks, "2026-07-27")).toBe(50);
});

it("rolls an unfinished task to the next date", () => {
  expect(rollTask(task, "2026-07-28").taskDate).toBe("2026-07-28");
});

it("exports readable Markdown", () => {
  expect(exportMarkdown(workspace)).toContain("# 一页 · 个人工作台导出");
});
```

- [ ] **Step 2: Run domain tests and confirm missing symbols fail**

Run: `npm test -- --run tests/domain.test.ts`
Expected: FAIL with unresolved domain imports.

- [ ] **Step 3: Implement canonical entities and pure functions**

Define `Task`, `WorkEntry`, `LearningEntry`, `DailyReview`, `Profile`, `Workspace`, `SaveStatus`, and input types. Implement timezone-aware `todayKey`, `nextDate`, task and record filters, completion rate, streak calculation, task rollover, JSON export, and Markdown export.

- [ ] **Step 4: Run domain tests**

Run: `npm test -- --run tests/domain.test.ts`
Expected: PASS.

- [ ] **Step 5: Write failing repository tests**

```ts
it("seeds an empty store and persists updates", async () => {
  const repo = new LocalWorkspaceRepository(memoryStorage);
  const initial = await repo.load();
  initial.profile.displayName = "金龙";
  await repo.save(initial);
  expect((await repo.load()).profile.displayName).toBe("金龙");
});

it("migrates unversioned persisted data", async () => {
  memoryStorage.setItem(STORAGE_KEY, JSON.stringify(legacyWorkspace));
  expect((await new LocalWorkspaceRepository(memoryStorage).load()).schemaVersion).toBe(1);
});
```

- [ ] **Step 6: Implement the repository contract, sample data, validation, and migration**

`WorkspaceRepository` exposes `load()`, `save(workspace)`, and `clear()`. `LocalWorkspaceRepository` accepts a Storage-compatible dependency, catches parse failures, validates arrays and profile fields, writes `schemaVersion: 1`, and throws actionable Chinese errors when storage is unavailable.

- [ ] **Step 7: Run repository and domain tests**

Run: `npm test -- --run tests/domain.test.ts tests/repository.test.ts`
Expected: PASS.

### Task 3: Build the workspace state provider and application shell

**Files:**
- Create: `src/state/workspace-provider.tsx`
- Create: `src/components/app-shell.tsx`
- Create: `src/components/ui.tsx`
- Modify: `src/app/page.tsx`
- Test: `tests/workbench.test.tsx`

- [ ] **Step 1: Write the failing provider and navigation test**

```tsx
it("navigates among the five workbench views", async () => {
  render(<Home />);
  await user.click(screen.getByRole("button", { name: "任务" }));
  expect(screen.getByRole("heading", { name: "任务" })).toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "设置" }));
  expect(screen.getByRole("heading", { name: "设置" })).toBeInTheDocument();
});
```

- [ ] **Step 2: Run the test and confirm navigation is absent**

Run: `npm test -- --run tests/workbench.test.tsx`
Expected: FAIL because the shell and provider do not exist.

- [ ] **Step 3: Implement state and shell boundaries**

The provider exposes loaded workspace data, `saveStatus`, `error`, task/record/review mutations, profile updates, reset, and retry. `AppShell` exposes `today`, `tasks`, `records`, `reviews`, and `settings` views with desktop sidebar and mobile bottom navigation. Shared UI includes `PageHeader`, `EmptyState`, `Modal`, `ConfirmDialog`, and `SaveIndicator`.

- [ ] **Step 4: Run the navigation test**

Run: `npm test -- --run tests/workbench.test.tsx`
Expected: PASS.

### Task 4: Implement today and task workflows

**Files:**
- Create: `src/features/today.tsx`
- Create: `src/features/tasks.tsx`
- Modify: `src/app/page.tsx`
- Modify: `tests/workbench.test.tsx`

- [ ] **Step 1: Add failing workflow tests**

```tsx
it("creates and completes a task", async () => {
  render(<Home />);
  await user.click(screen.getByRole("button", { name: "新建任务" }));
  await user.type(screen.getByLabelText("任务标题"), "完成产品原型");
  await user.click(screen.getByRole("button", { name: "保存任务" }));
  expect(screen.getByText("完成产品原型")).toBeInTheDocument();
  await user.click(screen.getByRole("checkbox", { name: "完成产品原型" }));
  expect(screen.getByText("已完成")).toBeInTheDocument();
});
```

- [ ] **Step 2: Run the workflow test and confirm it fails**

Run: `npm test -- --run tests/workbench.test.tsx -t "creates and completes"`
Expected: FAIL because task forms and actions are missing.

- [ ] **Step 3: Implement today and tasks**

Today renders focus items, completion progress, tasks, quick record actions, mood/energy controls, and review entry. Tasks supports create, edit, complete, cancel, delete with confirmation, date/status filters, and rollover to the next day. Forms validate non-empty titles and preserve draft values when repository saves fail.

- [ ] **Step 4: Run task workflow tests**

Run: `npm test -- --run tests/workbench.test.tsx`
Expected: PASS.

### Task 5: Implement work and learning records

**Files:**
- Create: `src/features/records.tsx`
- Modify: `src/features/today.tsx`
- Modify: `src/app/page.tsx`
- Modify: `tests/workbench.test.tsx`

- [ ] **Step 1: Add failing record tests**

```tsx
it("creates work and learning records and filters by keyword", async () => {
  render(<Home />);
  await createWorkEntry(user, "完成登录流程");
  await createLearningEntry(user, "理解 RLS 策略");
  await user.type(screen.getByLabelText("搜索记录"), "RLS");
  expect(screen.getByText("理解 RLS 策略")).toBeInTheDocument();
  expect(screen.queryByText("完成登录流程")).not.toBeInTheDocument();
});
```

- [ ] **Step 2: Run the record test and confirm it fails**

Run: `npm test -- --run tests/workbench.test.tsx -t "creates work and learning"`
Expected: FAIL because the records feature is missing.

- [ ] **Step 3: Implement record views and forms**

Use a segmented control for work and learning records. Implement create, edit, delete confirmation, date/keyword/tag filters, optional task relation, URL validation, and list rendering. Today quick actions open the corresponding record form.

- [ ] **Step 4: Run all component tests**

Run: `npm test -- --run tests/workbench.test.tsx`
Expected: PASS.

### Task 6: Implement daily reviews, settings, and exports

**Files:**
- Create: `src/features/reviews.tsx`
- Create: `src/features/settings.tsx`
- Modify: `src/app/page.tsx`
- Modify: `tests/workbench.test.tsx`

- [ ] **Step 1: Add failing review and settings tests**

```tsx
it("saves one review per date", async () => {
  render(<Home />);
  await openReview(user);
  await user.type(screen.getByLabelText("今天完成了什么"), "完成 MVP 交互");
  await user.click(screen.getByRole("button", { name: "保存复盘" }));
  expect(screen.getByText("完成 MVP 交互")).toBeInTheDocument();
});

it("exports JSON and requires confirmation before clearing data", async () => {
  render(<Home />);
  await openSettings(user);
  expect(screen.getByRole("button", { name: "导出 JSON" })).toBeEnabled();
  await user.click(screen.getByRole("button", { name: "清空本地数据" }));
  expect(screen.getByRole("dialog", { name: "确认清空数据" })).toBeInTheDocument();
});
```

- [ ] **Step 2: Run tests and confirm the features are missing**

Run: `npm test -- --run tests/workbench.test.tsx -t "review|exports"`
Expected: FAIL.

- [ ] **Step 3: Implement reviews and settings**

Reviews upsert by date and collect completed summary, gain, blockers, improvement, tomorrow focus, mood, energy, and notes. Settings edits display name and timezone, clearly labels local-only storage, downloads JSON or Markdown through object URLs, and clears data only after confirmation.

- [ ] **Step 4: Run component and domain tests**

Run: `npm test -- --run`
Expected: PASS.

### Task 7: Add the Supabase production schema

**Files:**
- Create: `supabase/schema.sql`
- Create: `tests/schema.test.ts`

- [ ] **Step 1: Add a failing SQL contract test**

```ts
it("enables RLS and scopes every business table to auth.uid", () => {
  for (const table of ["tasks", "work_entries", "learning_entries", "daily_reviews"]) {
    expect(sql).toContain(`alter table public.${table} enable row level security`);
  }
  expect(sql.match(/auth\.uid\(\) = user_id/g)?.length).toBeGreaterThanOrEqual(8);
});
```

- [ ] **Step 2: Run the SQL contract test**

Run: `npm test -- --run tests/schema.test.ts`
Expected: FAIL because the schema is absent.

- [ ] **Step 3: Implement tables, validation, indexes, timestamps, and RLS**

Create profiles and four business tables using UUID primary keys, foreign keys to `auth.users`, enum-compatible check constraints, `(user_id, review_date)` uniqueness, updated-at triggers, date/search indexes, and select/insert/update/delete policies scoped to `auth.uid()`.

- [ ] **Step 4: Run the SQL contract test**

Run: `npm test -- --run tests/schema.test.ts`
Expected: PASS.

### Task 8: Production and browser verification

**Files:**
- Create: `playwright.config.ts`
- Create: `e2e/workbench.spec.ts`
- Modify: `src/app/globals.css`

- [ ] **Step 1: Add desktop and mobile end-to-end tests**

```ts
for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
  test(`core workflow at ${viewport.width}px`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "今日工作台" })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  });
}
```

- [ ] **Step 2: Run lint, unit tests, and production build**

Run: `npm run lint && npm test -- --run && npm run build`
Expected: all commands exit 0.

- [ ] **Step 3: Start the development server and run Playwright**

Run: `npm run dev`
Expected: Next.js reports a local URL and remains running.

Run in a second session: `npm run test:e2e`
Expected: desktop and mobile scenarios pass.

- [ ] **Step 4: Inspect screenshots at 1440x900 and 390x844**

Verify navigation, modals, focus order, readable text, no overlap, no horizontal overflow, and that the next section remains visible without decorative marketing composition. Fix CSS and repeat the build and Playwright run until both viewports are clean.

## Execution Notes

This workspace is not a Git repository, so commit steps are intentionally omitted. Do not initialize Git without user authorization. The verified deliverable is the runnable source tree, passing tests, production build, Supabase schema, and active local development URL.
