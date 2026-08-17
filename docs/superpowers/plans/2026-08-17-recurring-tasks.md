# Recurring Tasks Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a cloud-synced recurring-plan page that materializes due occurrences as ordinary workspace tasks, supports fixed and completion-based schedules, and prevents duplicate generation across devices.

**Architecture:** Keep recurring definitions and occurrence history separate from ordinary tasks. Put calendar arithmetic and reconciliation in pure domain modules, let `WorkspaceProvider` orchestrate user actions and lifecycle checks, and let the Supabase repository claim each cloud occurrence through an idempotent database function before reloading canonical cloud state. Browser notification permission and per-device delivery receipts remain local.

**Tech Stack:** Next.js 15, React 19, TypeScript, Supabase PostgreSQL/RLS/RPC, Vitest and Testing Library, Playwright, Lucide React, existing CSS design system.

---

## File Map

### Create

- `src/domain/recurrence.ts` — date arithmetic, due-date selection, occurrence summaries, and pure workspace reconciliation.
- `src/state/recurring-actions.ts` — pure recurring-plan lifecycle transitions used by the provider.
- `src/features/recurring.tsx` — recurring page, plan form, filters, list rows, and confirmations.
- `src/features/recurring-notifications.ts` — per-device browser-notification permission and receipt storage.
- `tests/recurrence.test.ts` — calendar and reconciliation unit tests.
- `tests/recurring-actions.test.ts` — plan lifecycle and generated-task lifecycle tests.
- `tests/recurring-notifications.test.ts` — notification permission and deduplication tests.
- `supabase/migrations/20260817_add_recurring_tasks.sql` — production migration for plans, occurrences, task links, RLS, indexes, and idempotent materialization RPC.

### Modify

- `src/domain/types.ts` — Workspace v3, recurring types, inputs, and task source/link fields.
- `src/data/seed.ts` — initialize empty recurring collections.
- `src/data/local-repository.ts` — normalize Workspace v1/v2 into v3 and normalize recurring task links.
- `src/data/repository.ts` — add repository reconciliation contract.
- `src/data/supabase-repository.ts` — map recurring rows, load/save tables, call materialization RPC, and reload canonical state.
- `src/state/workspace-provider.tsx` — expose plan actions, reconcile on load/focus, and keep occurrences aligned with task actions.
- `src/domain/selectors.ts` — recurring counts and current/overdue selectors used by navigation and pages.
- `src/domain/export.ts` — add recurring plans and occurrences to Markdown export.
- `src/components/app-shell.tsx` — add “周期” navigation and due badge.
- `src/features/today.tsx` — show the recurring due summary and task badge.
- `src/features/tasks.tsx` — show “周期任务” without changing existing task actions.
- `src/app/globals.css` — responsive recurring-page, badges, form summary, and navigation-count styles.
- `supabase/schema.sql` — keep clean-install schema equal to the production migration result.
- `tests/repository.test.ts` — Workspace v3 local migration coverage.
- `tests/supabase-repository.test.ts` — recurring row mapping, queries, and RPC coverage.
- `tests/schema.test.ts` — table, constraint, index, trigger, RLS, and RPC contract coverage.
- `tests/domain.test.ts` — recurring selectors and Markdown export coverage.
- `tests/workbench.test.tsx` — recurring page and integration workflows.
- `e2e/workbench.spec.ts` — desktop/mobile navigation, creation, due materialization, and overflow checks.
- `README.md` — explain recurring behavior, browser reminder limits, and migration order.

## Task 1: Add Workspace v3 Contracts and Local Migration

**Files:**
- Modify: `src/domain/types.ts`
- Modify: `src/data/seed.ts`
- Modify: `src/data/local-repository.ts`
- Modify: `tests/repository.test.ts`

- [ ] **Step 1: Write failing Workspace v3 migration tests**

Add assertions that an old workspace gains empty recurring collections and that legacy tasks gain null recurring links:

```ts
expect(workspace.schemaVersion).toBe(3);
expect(workspace.recurringPlans).toEqual([]);
expect(workspace.recurringOccurrences).toEqual([]);
expect(workspace.tasks[0]).toMatchObject({
  recurringPlanId: null,
  recurrenceDueDate: null,
});
```

Add a persistence case containing one plan and one occurrence, then assert a save/load round trip preserves both collections.

- [ ] **Step 2: Run the focused test and verify red**

Run: `npm test -- --run tests/repository.test.ts`

Expected: FAIL because `schemaVersion` is still `2` and recurring collections do not exist.

- [ ] **Step 3: Add recurring contracts and task links**

Add these contracts to `src/domain/types.ts`:

```ts
export type RecurrenceUnit = "day" | "week" | "month" | "quarter" | "year";
export type RecurrenceMode = "fixed" | "after_completion";
export type MissedOccurrencePolicy = "catch_up_all" | "latest_only";
export type RecurringPlanStatus = "active" | "paused" | "terminated";
export type RecurringCategory = "work" | "life";
export type RecurringOccurrenceStatus =
  | "generated"
  | "completed"
  | "cancelled"
  | "skipped"
  | "deleted";

export interface RecurringPlan {
  id: string;
  title: string;
  description: string;
  category: RecurringCategory;
  startDate: string;
  interval: number;
  unit: RecurrenceUnit;
  mode: RecurrenceMode;
  missedPolicy: MissedOccurrencePolicy | null;
  priority: TaskPriority;
  inAppReminder: boolean;
  browserNotification: boolean;
  endDate: string | null;
  status: RecurringPlanStatus;
  completionAnchorDate: string | null;
  nextDueDate: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface RecurringOccurrence {
  id: string;
  recurringPlanId: string;
  dueDate: string;
  taskId: string | null;
  status: RecurringOccurrenceStatus;
  resolvedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export type RecurringPlanInput = Omit<
  RecurringPlan,
  "id" | "status" | "completionAnchorDate" | "nextDueDate" | "createdAt" | "updatedAt"
>;
```

Change task source and links:

```ts
source: "manual" | "work_entry" | "recurring_plan";
recurringPlanId: string | null;
recurrenceDueDate: string | null;
```

Change `Workspace` to:

```ts
export interface Workspace {
  schemaVersion: 3;
  profile: Profile;
  focusProjects: FocusProject[];
  tasks: WorkspaceTask[];
  workEntries: WorkEntry[];
  learningEntries: LearningEntry[];
  dailyReviews: DailyReview[];
  focusSessions: FocusSession[];
  recurringPlans: RecurringPlan[];
  recurringOccurrences: RecurringOccurrence[];
}
```

- [ ] **Step 4: Normalize seed and old local data**

In `createSeedWorkspace`, return `schemaVersion: 3`, `recurringPlans: []`, and `recurringOccurrences: []`.

In `normalizeTasks`, retain current backlog defaults and add:

```ts
recurringPlanId: typeof candidate.recurringPlanId === "string" ? candidate.recurringPlanId : null,
recurrenceDueDate: typeof candidate.recurrenceDueDate === "string" ? candidate.recurrenceDueDate : null,
source: candidate.source === "work_entry" || candidate.source === "recurring_plan"
  ? candidate.source
  : "manual",
```

In `normalizeWorkspace`, return `schemaVersion: 3` and safely default both recurring arrays to `[]`.

- [ ] **Step 5: Run migration and type tests**

Run: `npm test -- --run tests/repository.test.ts`

Expected: PASS.

Before running TypeScript, update every explicit `WorkspaceTask` fixture in `tests/domain.test.ts`, `tests/focus-session-action.test.ts`, `tests/supabase-repository.test.ts`, and `tests/workbench.test.tsx` with:

```ts
recurringPlanId: null,
recurrenceDueDate: null,
```

Update every explicit schema-version assertion from `2` to `3`, then run: `npx tsc --noEmit`

Expected: PASS.

- [ ] **Step 6: Commit Workspace v3**

```bash
git add src/domain/types.ts src/data/seed.ts src/data/local-repository.ts tests/repository.test.ts tests
git commit -m "feat: add recurring workspace contracts"
```

## Task 2: Implement Calendar-Safe Recurrence Arithmetic

**Files:**
- Create: `src/domain/recurrence.ts`
- Create: `tests/recurrence.test.ts`

- [ ] **Step 1: Write failing calendar tests**

Cover the approved examples explicitly:

```ts
expect(recurrenceDate("2026-08-20", 2, "week", 1)).toBe("2026-09-03");
expect(recurrenceDate("2026-01-31", 1, "month", 1)).toBe("2026-02-28");
expect(recurrenceDate("2026-01-31", 1, "month", 2)).toBe("2026-03-31");
expect(recurrenceDate("2024-02-29", 1, "year", 1)).toBe("2025-02-28");
expect(recurrenceDate("2024-02-29", 1, "year", 4)).toBe("2028-02-29");
expect(recurrenceDate("2026-02-28", 2, "quarter", 1)).toBe("2026-08-28");
```

Also test invalid dates, interval `0`, negative occurrence indexes, and end-date boundaries.

- [ ] **Step 2: Run the focused test and verify red**

Run: `npm test -- --run tests/recurrence.test.ts`

Expected: FAIL because `@/domain/recurrence` does not exist.

- [ ] **Step 3: Implement date arithmetic from the original anchor**

Implement these exports:

```ts
export function recurrenceDate(
  anchor: string,
  interval: number,
  unit: RecurrenceUnit,
  occurrenceIndex: number,
): string;

export function nextRecurringDate(
  anchor: string,
  interval: number,
  unit: RecurrenceUnit,
): string;
```

Use UTC-noon parsing for date-only values. For months, quarters, and years, calculate the target year/month directly from the original anchor and clamp only the resulting day:

```ts
const totalMonths = unit === "quarter"
  ? interval * occurrenceIndex * 3
  : unit === "year"
    ? interval * occurrenceIndex * 12
    : interval * occurrenceIndex;
const targetMonthIndex = anchorMonthIndex + totalMonths;
const targetYear = anchorYear + Math.floor(targetMonthIndex / 12);
const targetMonth = ((targetMonthIndex % 12) + 12) % 12;
const targetDay = Math.min(anchorDay, daysInUtcMonth(targetYear, targetMonth));
```

Do not advance month schedules iteratively; that would turn January 31 into a permanent February 28 anchor.

- [ ] **Step 4: Add fixed-schedule due-date selection**

Implement:

```ts
export interface DueDateResult {
  dueDates: string[];
  nextDueDate: string | null;
  overflow: boolean;
}

export function fixedDueDates(
  plan: RecurringPlan,
  today: string,
  existingDueDates: ReadonlySet<string>,
  limit?: number,
): DueDateResult;
```

Rules:

- Stop when a candidate is later than `today` or later than `endDate`.
- `catch_up_all` returns every missing due date, up to `limit` (default `100`).
- `latest_only` returns only the latest candidate not already represented.
- Return the first future candidate as `nextDueDate`; return `null` after termination or when `endDate` leaves no future candidate.
- Set `overflow: true` when more than 100 catch-up items are due.

- [ ] **Step 5: Run recurrence tests**

Run: `npm test -- --run tests/recurrence.test.ts`

Expected: PASS with month-end, leap-year, interval, policy, and limit cases covered.

- [ ] **Step 6: Commit recurrence arithmetic**

```bash
git add src/domain/recurrence.ts tests/recurrence.test.ts
git commit -m "feat: calculate recurring due dates"
```

## Task 3: Reconcile Due Occurrences Into Ordinary Tasks

**Files:**
- Modify: `src/domain/recurrence.ts`
- Create: `src/state/recurring-actions.ts`
- Create: `tests/recurring-actions.test.ts`

- [ ] **Step 1: Write failing reconciliation tests**

Build a minimal Workspace v3 fixture and verify:

```ts
const result = reconcileRecurringWorkspace(workspace, {
  today: "2026-08-17",
  now: "2026-08-17T08:00:00.000Z",
  createId: idSequence("occurrence-1", "task-1"),
});

expect(result.generatedCount).toBe(1);
expect(result.workspace.tasks[0]).toMatchObject({
  id: "task-1",
  title: "清理扫地机器人",
  taskDate: "2026-08-17",
  source: "recurring_plan",
  recurringPlanId: "plan-1",
  recurrenceDueDate: "2026-08-17",
  placement: "scheduled",
  status: "todo",
});
expect(result.workspace.recurringOccurrences[0]).toMatchObject({
  id: "occurrence-1",
  recurringPlanId: "plan-1",
  dueDate: "2026-08-17",
  taskId: "task-1",
  status: "generated",
});
```

Add cases for idempotent reruns, `latest_only`, `catch_up_all`, paused/terminated/end-date plans, after-completion waiting, and a deleted occurrence that must not be recreated.

- [ ] **Step 2: Run the focused test and verify red**

Run: `npm test -- --run tests/recurring-actions.test.ts`

Expected: FAIL because reconciliation and actions are not implemented.

- [ ] **Step 3: Implement pure reconciliation**

Add:

```ts
export interface RecurrenceReconcileOptions {
  today: string;
  now: string;
  createId: () => string;
  limit?: number;
}

export interface RecurrenceReconcileResult {
  workspace: Workspace;
  generatedCount: number;
  overflowPlanIds: string[];
}

export function reconcileRecurringWorkspace(
  workspace: Workspace,
  options: RecurrenceReconcileOptions,
): RecurrenceReconcileResult;
```

Use `(recurringPlanId, dueDate)` as the logical occurrence key. For each new due date, create one occurrence and one ordinary scheduled task. Preserve all unrelated array item references where possible so an idempotent pass can return the original workspace when no change is required.

For `after_completion`:

- Generate `startDate` once when no occurrence exists.
- While the latest occurrence is `generated`, do not create another.
- Use `completionAnchorDate` to calculate the next candidate after a resolved occurrence.
- Treat `completed`, `cancelled`, `skipped`, and `deleted` as resolved; deletion re-anchors from `resolvedAt` so the plan does not become stuck.

- [ ] **Step 4: Implement lifecycle helpers**

In `src/state/recurring-actions.ts`, add pure helpers:

```ts
export function createRecurringPlan(
  workspace: Workspace,
  input: RecurringPlanInput,
  now: string,
  id: string,
): Workspace;

export function updateRecurringPlan(
  workspace: Workspace,
  id: string,
  patch: RecurringPlanInput,
  now: string,
): Workspace;

export function setRecurringPlanStatus(
  workspace: Workspace,
  id: string,
  status: "active" | "paused" | "terminated",
  today: string,
  now: string,
): Workspace;

export function skipRecurringOccurrence(
  workspace: Workspace,
  planId: string,
  today: string,
  now: string,
  occurrenceId: string,
): Workspace;

export function syncOccurrenceForTask(
  workspace: Workspace,
  taskId: string,
  nextTaskStatus: TaskStatus | "deleted",
  today: string,
  now: string,
): Workspace;
```

`syncOccurrenceForTask` maps `done → completed`, `cancelled → cancelled`, deletion to `deleted`, and active task states to `generated`. Recompute `completionAnchorDate` from the latest resolved occurrence rather than incrementally mutating it, so reopening a completed task cannot leave a stale anchor.

- [ ] **Step 5: Run lifecycle tests**

Run: `npm test -- --run tests/recurrence.test.ts tests/recurring-actions.test.ts`

Expected: PASS.

- [ ] **Step 6: Commit reconciliation and lifecycle actions**

```bash
git add src/domain/recurrence.ts src/state/recurring-actions.ts tests/recurring-actions.test.ts tests/recurrence.test.ts
git commit -m "feat: materialize recurring task occurrences"
```

## Task 4: Add Supabase Schema, RLS, and Atomic Materialization

**Files:**
- Create: `supabase/migrations/20260817_add_recurring_tasks.sql`
- Modify: `supabase/schema.sql`
- Modify: `tests/schema.test.ts`

- [ ] **Step 1: Extend failing schema contract tests**

Add `recurring_plans` and `recurring_occurrences` to table, trigger, index, and RLS loops. Assert:

```ts
expect(tasks).toMatch(/source in \('manual', 'work_entry', 'recurring_plan'\)/);
expect(tasks).toMatch(/recurring_plan_id uuid/);
expect(tasks).toMatch(/recurrence_due_date date/);
expect(occurrences).toMatch(/unique \(user_id, recurring_plan_id, due_date\)/);
expect(schemaSource).toMatch(/create function public\.materialize_recurring_occurrence\(/);
```

Also assert the RPC obtains ownership from `auth.uid()` and contains no privileged service role or embedded credential.

- [ ] **Step 2: Run the schema test and verify red**

Run: `npm test -- --run tests/schema.test.ts`

Expected: FAIL because the recurring tables, task columns, and function do not exist.

- [ ] **Step 3: Write the idempotent production migration**

The migration must:

```sql
alter table public.tasks
  add column if not exists recurring_plan_id uuid,
  add column if not exists recurrence_due_date date;

alter table public.tasks drop constraint if exists tasks_source_check;
alter table public.tasks add constraint tasks_source_check
  check (source in ('manual', 'work_entry', 'recurring_plan'));
```

Create `recurring_plans` with the approved fields and checks for interval, unit, mode, missed policy, category, priority, status, and end-date ordering. Create `recurring_occurrences` with `user_id`, plan ID, due date, nullable task ID, status, resolution time, timestamps, and:

```sql
unique (user_id, recurring_plan_id, due_date)
```

Bind `tasks.recurring_plan_id` to `recurring_plans(id) on delete set null`. Bind occurrence `task_id` to `tasks(id) on delete set null` as a deferrable, initially deferred foreign key so the RPC can claim the occurrence before inserting its task in the same transaction.

Add user/date indexes, updated-at triggers, RLS, and owner-scoped CRUD policies matching existing schema conventions.

- [ ] **Step 4: Add an idempotent materialization RPC**

Create a security-invoker PL/pgSQL function that claims the logical occurrence before inserting a task in the same database transaction:

```sql
create or replace function public.materialize_recurring_occurrence(
  p_plan_id uuid,
  p_occurrence_id uuid,
  p_task_id uuid,
  p_due_date date,
  p_title text,
  p_description text,
  p_priority text,
  p_created_at timestamptz
) returns boolean
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
declare
  inserted_count integer;
begin
  insert into public.recurring_occurrences (
    id, user_id, recurring_plan_id, due_date, task_id, status, created_at, updated_at
  ) values (
    p_occurrence_id, auth.uid(), p_plan_id, p_due_date, p_task_id, 'generated', p_created_at, p_created_at
  ) on conflict (user_id, recurring_plan_id, due_date) do nothing;

  get diagnostics inserted_count = row_count;
  if inserted_count = 0 then return false; end if;

  insert into public.tasks (
    id, user_id, title, description, task_date, placement, priority, status, source,
    recurring_plan_id, recurrence_due_date, created_at, updated_at
  ) values (
    p_task_id, auth.uid(), p_title, p_description, p_due_date, 'scheduled', p_priority,
    'todo', 'recurring_plan', p_plan_id, p_due_date, p_created_at, p_created_at
  );
  return true;
end;
$$;
```

Validate `auth.uid()` is not null and confirm the referenced plan belongs to that user before insertion. Do not use `security definer`.

- [ ] **Step 5: Mirror the migration in the clean-install schema**

Update `supabase/schema.sql` so a new project gets exactly the same columns, tables, constraints, triggers, indexes, RLS policies, and RPC without running historical migrations.

- [ ] **Step 6: Run schema tests**

Run: `npm test -- --run tests/schema.test.ts`

Expected: PASS.

- [ ] **Step 7: Commit the database contract**

```bash
git add supabase/schema.sql supabase/migrations/20260817_add_recurring_tasks.sql tests/schema.test.ts
git commit -m "feat: add recurring task database schema"
```

## Task 5: Map and Reconcile Recurring Data in Repositories

**Files:**
- Modify: `src/data/repository.ts`
- Modify: `src/data/local-repository.ts`
- Modify: `src/data/supabase-repository.ts`
- Modify: `tests/supabase-repository.test.ts`

- [ ] **Step 1: Write failing row-mapping and RPC tests**

Extend the existing workspace mapping fixture with one plan, one occurrence, and one recurring task. Assert snake-case rows and exact round-trip equality.

Add a mocked Supabase RPC test:

```ts
expect(rpc).toHaveBeenCalledWith("materialize_recurring_occurrence", {
  p_plan_id: "plan-1",
  p_occurrence_id: "occurrence-1",
  p_task_id: "task-1",
  p_due_date: "2026-08-17",
  p_title: "清理扫地机器人",
  p_description: "清理尘盒和滚刷",
  p_priority: "medium",
  p_created_at: "2026-08-17T08:00:00.000Z",
});
```

Test that an RPC result of `false` is treated as another device already winning, followed by a canonical reload rather than an error.

- [ ] **Step 2: Run the focused test and verify red**

Run: `npm test -- --run tests/supabase-repository.test.ts`

Expected: FAIL because recurring row collections and reconciliation are absent.

- [ ] **Step 3: Extend the repository contract**

Add:

```ts
export interface RecurringReconcileRequest {
  workspace: Workspace;
  today: string;
  now: string;
  createId: () => string;
}

export interface WorkspaceRepository {
  load(): Promise<Workspace>;
  save(workspace: Workspace): Promise<void>;
  clear(): Promise<void>;
  reconcileRecurring(request: RecurringReconcileRequest): Promise<Workspace>;
}
```

`LocalWorkspaceRepository.reconcileRecurring` calls the pure reconciler, saves the returned workspace when changed, and returns it.

- [ ] **Step 4: Add Supabase row types and mappings**

Add `RecurringPlanRow` and `RecurringOccurrenceRow`, include both arrays in `SupabaseRows`, and map every approved field in both directions. Add recurring task link fields to `TaskRow`.

Change `rowsToWorkspace` to `schemaVersion: 3` and ensure old nullable task columns map to null.

- [ ] **Step 5: Load, save, and clear recurring tables**

Add both selects to `loadOnce`, include plans in normal table synchronization, and include occurrence status updates in synchronization. Clear in foreign-key-safe order:

```ts
await this.deleteAll("focus_sessions");
await this.deleteAll("recurring_occurrences");
await this.deleteAll("tasks");
await this.deleteAll("recurring_plans");
```

Keep all other existing tables in the clear sequence.

- [ ] **Step 6: Implement cloud reconciliation through the RPC**

In `SupabaseWorkspaceRepository.reconcileRecurring`:

1. Run the pure reconciler against the loaded workspace to obtain candidate task/occurrence pairs.
2. Call `materialize_recurring_occurrence` only for newly proposed pairs.
3. Let the RPC return `false` when another device already created the logical due date.
4. Save changed `nextDueDate` and completion-anchor plan rows.
5. Reload and return canonical cloud state after all claims.

If any RPC call fails, throw `云端周期任务生成失败：...`; do not return the speculative local workspace.

- [ ] **Step 7: Run repository tests**

Run: `npm test -- --run tests/repository.test.ts tests/supabase-repository.test.ts`

Expected: PASS, including v3 migration, row round trip, query count, RPC win, and RPC duplicate cases.

- [ ] **Step 8: Commit repository support**

```bash
git add src/data/repository.ts src/data/local-repository.ts src/data/supabase-repository.ts tests/repository.test.ts tests/supabase-repository.test.ts
git commit -m "feat: sync recurring plans across devices"
```

## Task 6: Integrate Recurring Lifecycle With WorkspaceProvider

**Files:**
- Modify: `src/state/workspace-provider.tsx`
- Modify: `tests/workbench.test.tsx`

- [ ] **Step 1: Write failing provider integration tests**

Add tests that:

- create a plan and see a due task appear;
- update a generated task to done and advance an after-completion plan;
- delete a recurring task and retain a `deleted` occurrence;
- pause and resume a fixed plan;
- dispatch `focus` and verify reconciliation remains idempotent.

Use fixed dates in stored fixtures and call `window.dispatchEvent(new Event("focus"))`.

- [ ] **Step 2: Run the focused tests and verify red**

Run: `npm test -- --run tests/workbench.test.tsx`

Expected: FAIL because the provider does not expose recurring operations or reconciliation.

- [ ] **Step 3: Extend the context API**

Add these functions to `WorkspaceContextValue`:

```ts
createRecurringPlan: (input: RecurringPlanInput) => Promise<void>;
updateRecurringPlan: (id: string, input: RecurringPlanInput) => Promise<void>;
pauseRecurringPlan: (id: string) => Promise<void>;
resumeRecurringPlan: (id: string) => Promise<void>;
terminateRecurringPlan: (id: string) => Promise<void>;
skipRecurringPlanOccurrence: (id: string) => Promise<void>;
reconcileRecurringNow: () => Promise<void>;
```

Each action must create a complete next Workspace through `recurring-actions.ts`, call `replaceWorkspace`, and then reconcile if the action can make an occurrence due immediately.

- [ ] **Step 4: Reconcile after load and focus without loops**

Use a ref to prevent overlapping checks:

```ts
const recurringCheckRef = useRef(false);

const reconcileRecurringNow = useCallback(async () => {
  if (!repository || !workspaceRef.current || recurringCheckRef.current) return;
  recurringCheckRef.current = true;
  try {
    const next = await repository.reconcileRecurring({
      workspace: workspaceRef.current,
      today: todayKey(workspaceRef.current.profile.timezone),
      now: new Date().toISOString(),
      createId,
    });
    workspaceRef.current = next;
    setWorkspace(next);
    await localRepository?.save(next);
  } finally {
    recurringCheckRef.current = false;
  }
}, [localRepository, repository]);
```

Call it after repository/cloud load completes and from a `window.focus` listener. Do not put `workspace` itself in an effect dependency that would reconcile after every state update.

- [ ] **Step 5: Synchronize task lifecycle into occurrences**

Before saving an update/delete for a recurring task, call `syncOccurrenceForTask`. Preserve existing work-entry and focus-session unlinking logic. After a completion, cancellation, or deletion on an after-completion plan, call reconciliation so the next due date is updated.

Manual edits to title, description, task date, priority, placement, and backlog fields must not modify the plan or `recurrenceDueDate`.

- [ ] **Step 6: Include recurring data in migration and reset checks**

Add recurring arrays to `hasLocalData`. The existing local-to-cloud migration dialog must treat a local plan or occurrence as user data. Reset must clear notification receipts in Task 8 as well as Workspace data.

- [ ] **Step 7: Run provider tests**

Run: `npm test -- --run tests/workbench.test.tsx tests/recurring-actions.test.ts`

Expected: PASS.

- [ ] **Step 8: Commit provider integration**

```bash
git add src/state/workspace-provider.tsx tests/workbench.test.tsx
git commit -m "feat: manage recurring plans in workspace state"
```

## Task 7: Build the Recurring Page and Plan Form

**Files:**
- Create: `src/features/recurring.tsx`
- Modify: `src/domain/selectors.ts`
- Modify: `src/components/app-shell.tsx`
- Modify: `src/app/globals.css`
- Modify: `tests/domain.test.ts`
- Modify: `tests/workbench.test.tsx`

- [ ] **Step 1: Write failing selector and page tests**

Add selector expectations for today, future-seven-day, overdue, paused, and navigation counts. Add UI tests for:

- “周期” navigation and heading;
- opening “新建周期”;
- creating “每 5 天” after-completion plan;
- natural-language summary;
- validation of interval and end date;
- pause/resume/skip/terminate confirmation;
- filtering active/paused/terminated plans.

- [ ] **Step 2: Run focused tests and verify red**

Run: `npm test -- --run tests/domain.test.ts tests/workbench.test.tsx`

Expected: FAIL because recurring selectors and page do not exist.

- [ ] **Step 3: Add recurring selectors**

Implement:

```ts
export function recurringPlanSummary(
  plans: RecurringPlan[],
  occurrences: RecurringOccurrence[],
  tasks: WorkspaceTask[],
  today: string,
): {
  dueToday: number;
  nextSevenDays: number;
  overdue: number;
  paused: number;
};

export function openRecurringTasks(
  tasks: WorkspaceTask[],
): WorkspaceTask[];
```

Count overdue by unresolved recurring tasks whose `recurrenceDueDate < today`, including tasks that have moved to backlog. Do not count done or cancelled tasks.

- [ ] **Step 4: Build the form with explicit accessible labels**

Use the existing `Modal`, `PageHeader`, `ConfirmDialog`, buttons, fields, segmented controls, and badges. The form must include labels matching:

```text
周期名称
说明（可选）
分类
首次执行日期
周期数字
周期单位
计算基准
漏期处理
任务优先级
页面提醒
浏览器通知
结束日期（可选）
```

Hide/disable “漏期处理” for `after_completion`. Render a live sentence such as:

```text
从 2026年8月20日开始，每 2 周生成一次；按固定日期循环；漏期时每期都补。
```

Validate title, positive integer interval, start date, and end date before calling the provider.

- [ ] **Step 5: Build summary, filters, and plan rows**

Use an unframed summary grid and compact list rows consistent with current task/focus pages. Each row shows category, human-readable recurrence, mode, next date, status, and last occurrence status. Use Lucide icons for edit, pause/play, skip, and terminate, with `aria-label` and native `title` tooltips where the icon is not self-explanatory.

Do not nest cards or introduce a marketing-style layout.

- [ ] **Step 6: Add navigation and responsive styles**

Add `"recurring"` to the `View` union, `RefreshCw` (or `CalendarSync` if present in the installed Lucide version) to navigation, and render `RecurringView`. Add a small stable-size due badge inside the nav button.

In CSS, keep controls from changing size when counts appear, use grid constraints for summary/list rows, and collapse row metadata/actions cleanly below 720px and 420px.

- [ ] **Step 7: Run page tests**

Run: `npm test -- --run tests/domain.test.ts tests/workbench.test.tsx`

Expected: PASS.

- [ ] **Step 8: Commit recurring page**

```bash
git add src/features/recurring.tsx src/domain/selectors.ts src/components/app-shell.tsx src/app/globals.css tests/domain.test.ts tests/workbench.test.tsx
git commit -m "feat: add recurring plans page"
```

## Task 8: Add Today Integration and Per-Device Notifications

**Files:**
- Create: `src/features/recurring-notifications.ts`
- Create: `tests/recurring-notifications.test.ts`
- Modify: `src/features/today.tsx`
- Modify: `src/features/tasks.tsx`
- Modify: `src/features/recurring.tsx`
- Modify: `src/state/workspace-provider.tsx`
- Modify: `src/app/globals.css`
- Modify: `tests/workbench.test.tsx`

- [ ] **Step 1: Write failing notification tests**

Use a fake `Notification` constructor and memory storage. Verify permission is only requested after the user toggles it, denied permission does not throw, and the same key is delivered once:

```ts
const key = notificationReceiptKey("plan-1", "2026-08-17");
expect(notifyDueOccurrences(storage, FakeNotification, [occurrence], [plan])).toBe(1);
expect(storage.getItem(key)).toBe("sent");
expect(notifyDueOccurrences(storage, FakeNotification, [occurrence], [plan])).toBe(0);
```

- [ ] **Step 2: Run notification tests and verify red**

Run: `npm test -- --run tests/recurring-notifications.test.ts`

Expected: FAIL because notification helpers do not exist.

- [ ] **Step 3: Implement local notification helpers**

Export:

```ts
export const RECURRING_NOTIFICATION_PREFIX = "personal-workbench.recurring-notification.v1";
export function notificationReceiptKey(planId: string, dueDate: string): string;
export async function requestRecurringNotificationPermission(): Promise<NotificationPermission>;
export function notifyDueOccurrences(
  storage: Storage,
  notificationApi: typeof Notification | undefined,
  plans: RecurringPlan[],
  occurrences: RecurringOccurrence[],
  today: string,
): number;
export function clearRecurringNotificationReceipts(storage: Storage): void;
```

Only notify generated occurrences due today whose plan has `browserNotification: true`. Store one receipt per device/plan/due date. Never treat unavailable or denied browser notification as a workspace save error.

- [ ] **Step 4: Connect notification permission to the plan form**

When the user turns “浏览器通知” on, request permission from that direct click. If denied, leave the plan’s browser-notification option off and display an inline explanation. Do not ask permission during page load.

- [ ] **Step 5: Add Today and task markers**

In `TodayView`, show an unframed alert band only when due count is nonzero. Its command navigates to “周期” or scrolls to the generated tasks. In `TaskRow`, show a “周期任务” badge when `source === "recurring_plan"`; preserve the “已部署但未执行” badge if the recurring task later moves to backlog.

- [ ] **Step 6: Trigger notifications after reconciliation**

After a successful local/cloud reconcile and local cache save, call `notifyDueOccurrences`. Also invoke it on window focus. Clear receipts during full workspace reset.

- [ ] **Step 7: Run notification and integration tests**

Run: `npm test -- --run tests/recurring-notifications.test.ts tests/workbench.test.tsx`

Expected: PASS.

- [ ] **Step 8: Commit reminders and task integration**

```bash
git add src/features/recurring-notifications.ts src/features/today.tsx src/features/tasks.tsx src/features/recurring.tsx src/state/workspace-provider.tsx src/app/globals.css tests/recurring-notifications.test.ts tests/workbench.test.tsx
git commit -m "feat: remind about due recurring tasks"
```

## Task 9: Export, Documentation, and Migration Guidance

**Files:**
- Modify: `src/domain/export.ts`
- Modify: `tests/domain.test.ts`
- Modify: `README.md`

- [ ] **Step 1: Write a failing Markdown export test**

Build a workspace with active and paused plans and assert the export contains:

```md
## 周期计划
- 清理扫地机器人｜每 5 天｜完成后重新计时｜进行中｜下次：2026-08-22
- 还房贷｜每 1 月｜固定日期循环｜已暂停｜下次：2026-09-15
```

Also assert JSON export naturally includes `recurringPlans`, `recurringOccurrences`, and task links.

- [ ] **Step 2: Run the export test and verify red**

Run: `npm test -- --run tests/domain.test.ts`

Expected: FAIL because Markdown export has no recurring section.

- [ ] **Step 3: Add recurring export output**

Add a “周期计划” section after tasks and before work records. Use shared human-readable recurrence/status formatters from `recurrence.ts`; do not duplicate label maps in the exporter.

- [ ] **Step 4: Update README**

Document:

- the new “周期” page;
- fixed versus after-completion behavior;
- “每期都补” versus “只保留最近一期”;
- browser notification works only while the page can run;
- cloud plans/occurrences sync, notification permission does not;
- `20260817_add_recurring_tasks.sql` must be executed after existing migrations.

- [ ] **Step 5: Run export tests**

Run: `npm test -- --run tests/domain.test.ts`

Expected: PASS.

- [ ] **Step 6: Commit export and docs**

```bash
git add src/domain/export.ts tests/domain.test.ts README.md
git commit -m "docs: explain recurring task workflow"
```

## Task 10: Full Regression, Browser QA, and Local Demo

**Files:**
- Modify: `e2e/workbench.spec.ts`
- Modify: `src/app/globals.css` only if browser evidence finds layout defects

- [ ] **Step 1: Add failing end-to-end coverage**

Extend navigation expectations with `周期`. Add one desktop workflow that creates a fixed monthly plan due today and verifies:

```text
周期页 shows the plan
今日页 shows the due summary
任务 row shows 周期任务
the generated task can be completed
```

Add a 390px mobile workflow that opens the form, fills the longest option labels, saves a plan, uses pause/resume controls, and asserts:

```ts
const fitsViewport = await page.evaluate(
  () => document.documentElement.scrollWidth <= window.innerWidth,
);
expect(fitsViewport).toBeTruthy();
```

- [ ] **Step 2: Run the recurring E2E tests and verify red or green for the intended reason**

Run: `npm run test:e2e -- --grep "周期"`

Expected before final selectors/styles are complete: FAIL on missing interaction or overflow assertion. Fix only the evidenced defects.

- [ ] **Step 3: Run the complete automated verification suite**

Run each command separately:

```bash
npm test -- --run
npm run lint
npx tsc --noEmit
npm run build
npm run test:e2e
```

Expected: every command exits `0`; Vitest and Playwright report zero failed tests; Next.js completes a production build.

- [ ] **Step 4: Start the local demo server**

Run:

```bash
npm run dev -- --hostname 0.0.0.0 --port 3104
```

Expected: Next.js reports the local URL and the process remains running for review.

- [ ] **Step 5: Perform browser visual and interaction QA**

Using the in-app Browser, verify at desktop and 390px mobile widths:

- navigation has no overlap and the due count does not resize buttons;
- the recurring form has no clipped labels or controls;
- summary, list rows, actions, confirmation dialogs, task badge, and Today reminder are readable;
- browser notification denial leaves page reminders and task generation working;
- task completion updates the plan’s next date;
- no horizontal overflow exists.

Capture screenshots for both viewports and inspect them before approval.

- [ ] **Step 6: Verify real Supabase synchronization before publishing**

Apply `supabase/migrations/20260817_add_recurring_tasks.sql` in the existing Supabase project. In the local cloud-mode app:

1. Create a uniquely named test plan due today.
2. Confirm one row exists in `recurring_plans`.
3. Confirm exactly one matching row exists in `recurring_occurrences`.
4. Confirm exactly one task exists with `source = 'recurring_plan'`, matching `recurring_plan_id`, and matching `recurrence_due_date`.
5. Refresh or open a second device/session and confirm no duplicate task appears.
6. Complete the generated task and confirm occurrence status and next due date update in Supabase.
7. Delete the test plan only if it has no retained history; otherwise terminate it and remove only the test task/occurrence rows through an explicit scoped cleanup.

- [ ] **Step 7: Present the local Demo for user approval**

Do not push feature commits or update GitHub Pages yet. Give the user the local demo URL and wait for explicit approval.

- [ ] **Step 8: Commit final QA fixes**

```bash
git add e2e/workbench.spec.ts src/app/globals.css
git commit -m "test: verify recurring task workflows"
```

After user approval, push `main`, watch GitHub Actions and Pages deployment, then repeat the real cloud assertions against `https://jinlonchen.github.io/personal-workbench/`.

## Completion Criteria

- A user can create, edit, pause, resume, skip, and terminate a recurring plan from a dedicated navigation page.
- Every `N` day/week/month/quarter/year rule follows approved month-end and leap-year behavior.
- Fixed plans support catch-up-all or latest-only; completion-based plans wait for the current instance to resolve.
- A due occurrence becomes an ordinary task with existing Today, backlog, Pomodoro, and task-action behavior.
- Opening multiple devices cannot create duplicate logical occurrences or duplicate tasks.
- Plans, occurrences, task links, and status changes are verified in Supabase rather than only in browser storage.
- Browser reminders are optional, per-device, and non-blocking; page reminders work without permission.
- Workspace v1/v2 data migrates to v3 without changing existing tasks, projects, records, reviews, or focus sessions.
- Vitest, ESLint, TypeScript, production build, and Playwright all pass.
- Desktop and 390px mobile screenshots show no clipping, overlap, or horizontal overflow.
- The feature remains local-only until the user approves the Demo; only then is GitHub updated.
