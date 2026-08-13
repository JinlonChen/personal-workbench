# Task Pomodoro Timer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a device-local Pomodoro timer to the existing Today view and sync only confirmed focus sessions to the task workspace.

**Architecture:** Completed sessions become first-class `Workspace` records and flow through the existing local/Supabase repositories. The active timer uses a small versioned local-storage state machine with absolute timestamps, so page reloads and backgrounding recover correctly without cross-device timer synchronization. UI changes stay inside the Today view and reusable task row, preserving navigation and existing workflows.

**Tech Stack:** Next.js 15 static export, React 19, TypeScript, Vitest, Testing Library, Supabase PostgreSQL, Lucide React, browser `localStorage`, Notification API, Web Audio API.

---

### Task 1: Add focus-session domain data and workspace migration

**Files:**
- Modify: `src/domain/types.ts`
- Modify: `src/data/seed.ts`
- Modify: `src/data/local-repository.ts`
- Modify: `tests/schema.test.ts`
- Modify: `tests/repository.test.ts`

- [ ] **Step 1: Write failing schema and repository tests**

Add assertions that a new workspace uses schema version 2 and contains `focusSessions: []`. Add a legacy-storage test that loads a version 1 object without `focusSessions` and returns version 2 with all existing records intact.

```ts
expect(createSeedWorkspace("2026-08-13")).toMatchObject({
  schemaVersion: 2,
  focusSessions: [],
});

storage.setItem(STORAGE_KEY, JSON.stringify({
  ...createSeedWorkspace("2026-08-13"),
  schemaVersion: 1,
  focusSessions: undefined,
}));
expect(await repository.load()).toMatchObject({ schemaVersion: 2, focusSessions: [] });
```

- [ ] **Step 2: Run tests and verify failure**

Run: `npm test -- --run tests/schema.test.ts tests/repository.test.ts`

Expected: FAIL because `schemaVersion` is 1 and `focusSessions` does not exist.

- [ ] **Step 3: Add the focus-session types and migration**

Define the fixed duration and session types, then add the collection to `Workspace`:

```ts
export type PomodoroMinutes = 15 | 25 | 45 | 60;

export interface FocusSession {
  id: string;
  taskId: string | null;
  taskTitle: string;
  focusDate: string;
  plannedMinutes: PomodoroMinutes;
  completedAt: string;
  createdAt: string;
}

export interface Workspace {
  schemaVersion: 2;
  // existing fields
  focusSessions: FocusSession[];
}
```

Update the seed and local normalization to always emit schema version 2 and default missing sessions to `[]`. Keep the existing storage key so current users are upgraded in place.

- [ ] **Step 4: Run the focused tests**

Run: `npm test -- --run tests/schema.test.ts tests/repository.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit the domain migration**

```bash
git add src/domain/types.ts src/data/seed.ts src/data/local-repository.ts tests/schema.test.ts tests/repository.test.ts
git commit -m "feat: add focus session workspace data"
```

### Task 2: Add focus-session selectors and export output

**Files:**
- Modify: `src/domain/selectors.ts`
- Modify: `src/domain/export.ts`
- Modify: `tests/domain.test.ts`

- [ ] **Step 1: Write failing aggregation and export tests**

Use sessions spanning two dates and two tasks. Assert exact per-day totals, completed count, task lifetime total, and a Markdown section that includes the task title, duration, and daily total.

```ts
expect(focusSummaryForDate(sessions, "2026-08-13")).toEqual({ count: 2, minutes: 40 });
expect(focusMinutesForTask(sessions, "task-1")).toBe(55);
expect(exportMarkdown(workspace)).toContain("## 专注记录");
expect(exportMarkdown(workspace)).toContain("2026-08-13 · 40 分钟");
```

- [ ] **Step 2: Run the domain tests and verify failure**

Run: `npm test -- --run tests/domain.test.ts`

Expected: FAIL because the focus selectors are missing.

- [ ] **Step 3: Implement pure aggregation helpers and Markdown export**

Add:

```ts
export function focusSummaryForDate(sessions: FocusSession[], date: string) {
  const matches = sessions.filter((session) => session.focusDate === date);
  return {
    count: matches.length,
    minutes: matches.reduce((sum, session) => sum + session.plannedMinutes, 0),
  };
}

export function focusMinutesForTask(sessions: FocusSession[], taskId: string) {
  return sessions
    .filter((session) => session.taskId === taskId)
    .reduce((sum, session) => sum + session.plannedMinutes, 0);
}
```

Extend Markdown export with date-grouped focus-session rows and daily totals.

- [ ] **Step 4: Run the domain tests**

Run: `npm test -- --run tests/domain.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit selectors and export**

```bash
git add src/domain/selectors.ts src/domain/export.ts tests/domain.test.ts
git commit -m "feat: summarize task focus time"
```

### Task 3: Persist completed sessions through local and cloud repositories

**Files:**
- Modify: `src/data/supabase-repository.ts`
- Modify: `src/state/workspace-provider.tsx`
- Modify: `tests/supabase-repository.test.ts`
- Modify: `tests/workbench.test.tsx`
- Modify: `supabase/schema.sql`
- Create: `supabase/migrations/20260813_add_focus_sessions.sql`

- [ ] **Step 1: Write failing row-mapping and provider tests**

Add a Supabase round-trip test for:

```ts
workspace.focusSessions = [{
  id: "session-1",
  taskId: "task-1",
  taskTitle: "完成产品原型",
  focusDate: "2026-08-13",
  plannedMinutes: 25,
  completedAt: "2026-08-13T09:25:00.000Z",
  createdAt: "2026-08-13T09:25:00.000Z",
}];
```

Assert `focus_sessions` is included in repository load/save/clear operations. Add a provider-level UI test proving a confirmed session appears in workspace-derived totals only once.

- [ ] **Step 2: Run focused tests and verify failure**

Run: `npm test -- --run tests/supabase-repository.test.ts tests/workbench.test.tsx`

Expected: FAIL because the repository and provider do not know about focus sessions.

- [ ] **Step 3: Add repository mapping and provider action**

Add `FocusSessionRow`, `focusSessionToRow`, and `focusSessionFromRow`. Include the table in load, `syncTable`, and `clear`. Add this provider API:

```ts
createFocusSession: (input: Omit<FocusSession, "createdAt">) => Promise<void>;
```

Implementation preserves the supplied session ID for retry idempotency, assigns `createdAt`, appends the record, and uses `replaceWorkspace`.

- [ ] **Step 4: Add Supabase schema and migration**

Create the table with duration check, nullable task foreign key, indexes, RLS, and own-user CRUD policies:

```sql
create table public.focus_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  task_id uuid references public.tasks(id) on delete set null,
  task_title text not null,
  focus_date date not null,
  planned_minutes smallint not null check (planned_minutes in (15, 25, 45, 60)),
  completed_at timestamptz not null,
  created_at timestamptz not null default now()
);
```

Mirror the production definition in `supabase/schema.sql` and create an idempotent migration in `supabase/migrations/20260813_add_focus_sessions.sql`.

- [ ] **Step 5: Run focused tests**

Run: `npm test -- --run tests/supabase-repository.test.ts tests/workbench.test.tsx`

Expected: PASS.

- [ ] **Step 6: Commit cloud persistence**

```bash
git add src/data/supabase-repository.ts src/state/workspace-provider.tsx tests/supabase-repository.test.ts tests/workbench.test.tsx supabase/schema.sql supabase/migrations/20260813_add_focus_sessions.sql
git commit -m "feat: sync completed focus sessions"
```

### Task 4: Implement the device-local timer state machine

**Files:**
- Create: `src/features/pomodoro-state.ts`
- Create: `tests/pomodoro-state.test.ts`

- [ ] **Step 1: Write failing state-machine tests with a fake clock**

Cover start, pause, resume, reload recovery before and after the deadline, abandon, invalid stored JSON, and clock rollback. Use explicit timestamps so tests do not wait in real time.

```ts
const started = startPomodoro(task, 25, Date.parse("2026-08-13T09:00:00Z"));
expect(remainingPomodoroMs(started, Date.parse("2026-08-13T09:10:00Z"))).toBe(15 * 60_000);
expect(recoverPomodoro(started, Date.parse("2026-08-13T09:26:00Z")).status)
  .toBe("awaiting_confirmation");
```

- [ ] **Step 2: Run the timer tests and verify failure**

Run: `npm test -- --run tests/pomodoro-state.test.ts`

Expected: FAIL because the module does not exist.

- [ ] **Step 3: Implement pure transitions and storage adapter**

Export a versioned `LocalPomodoroState`, `loadPomodoro`, `savePomodoro`, `clearPomodoro`, `startPomodoro`, `pausePomodoro`, `resumePomodoro`, `recoverPomodoro`, and `remainingPomodoroMs`. Use one stable session ID from start through confirmed save.

The rollback guard compares current time with the last observed time. If time moves backward beyond a small tolerance, preserve a recoverable paused state instead of extending or auto-completing the session.

- [ ] **Step 4: Run the timer tests**

Run: `npm test -- --run tests/pomodoro-state.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit timer logic**

```bash
git add src/features/pomodoro-state.ts tests/pomodoro-state.test.ts
git commit -m "feat: add recoverable pomodoro state machine"
```

### Task 5: Build the Today-page Pomodoro UI

**Files:**
- Create: `src/features/pomodoro-timer.tsx`
- Modify: `src/features/today.tsx`
- Modify: `src/features/tasks.tsx`
- Modify: `src/app/globals.css`
- Modify: `tests/workbench.test.tsx`

- [ ] **Step 1: Write failing component behavior tests**

Use fake timers to assert:

- only today's todo/doing tasks appear;
- default duration is 25 and preset buttons select 15/25/45/60;
- starting changes a todo task to doing;
- pause freezes and continue resumes;
- abandon creates no record;
- reaching zero shows “完成并计入” and does not yet change totals;
- confirmation adds exactly one session and updates today's and task totals.

```ts
await user.click(screen.getByRole("button", { name: "开始专注" }));
expect(screen.getByText("进行中")).toBeInTheDocument();
vi.advanceTimersByTime(25 * 60_000);
expect(screen.getByRole("button", { name: "完成并计入" })).toBeInTheDocument();
```

- [ ] **Step 2: Run the component tests and verify failure**

Run: `npm test -- --run tests/workbench.test.tsx`

Expected: FAIL because the Today view has no timer.

- [ ] **Step 3: Implement the accessible timer component**

Build `PomodoroTimer` with a task `select`, duration segmented buttons, stable `MM:SS` display, and explicit icon-plus-text commands. Use `setInterval` only to repaint from absolute timestamps; state transitions remain in `pomodoro-state.ts`.

On confirm, call `createFocusSession` with the stable timer ID. Clear local timer state only after the workspace save succeeds. Keep `awaiting_confirmation` and surface the existing provider error after a failed save so the same ID can be retried.

- [ ] **Step 4: Add completion feedback**

On start, request notification permission only when the API exists and permission is `default`. On expiry, play a short Web Audio tone and send a system notification only when permission is `granted`. Keep the visible confirmation panel as the reliable fallback.

- [ ] **Step 5: Integrate totals into Today and task rows**

Render the timer between the focus band and task section. Extend `TaskList` with an optional `focusSessions` prop and show `N 分钟专注` only for positive totals. Preserve the Tasks page by passing the same workspace sessions without restructuring its controls.

- [ ] **Step 6: Add responsive styles**

Use existing colors, radii, typography, and button conventions. Keep fixed-width timer digits, wrap duration controls on narrow screens, and ensure task actions remain reachable at 390px without horizontal scrolling.

- [ ] **Step 7: Run component tests**

Run: `npm test -- --run tests/workbench.test.tsx`

Expected: PASS.

- [ ] **Step 8: Commit the Today-page UI**

```bash
git add src/features/pomodoro-timer.tsx src/features/today.tsx src/features/tasks.tsx src/app/globals.css tests/workbench.test.tsx
git commit -m "feat: add task pomodoro to today view"
```

### Task 6: Complete exports, reset behavior, and regression coverage

**Files:**
- Modify: `src/state/workspace-provider.tsx`
- Modify: `src/features/settings.tsx`
- Modify: `tests/workbench.test.tsx`
- Modify: `tests/schema.test.ts`
- Modify: `e2e/workbench.spec.ts`
- Modify: `README.md`

- [ ] **Step 1: Add failing edge-case tests**

Cover active-task local deletion handling, a session whose task was remotely deleted, corrupted timer state, reset clearing completed sessions, and existing navigation/task/record/review behavior.

- [ ] **Step 2: Run focused tests and verify failure**

Run: `npm test -- --run tests/workbench.test.tsx tests/schema.test.ts tests/pomodoro-state.test.ts`

Expected: at least one new edge-case assertion fails.

- [ ] **Step 3: Implement the edge-case behavior**

Block deletion of the currently timed task with an actionable dialog inside the task workflow, or require the active timer to be completed/abandoned first. Ensure workspace reset clears completed sessions while the timer component clears its separate local state when it observes reset data.

- [ ] **Step 4: Update E2E and README**

Add an E2E smoke path that selects a seeded task, starts and abandons a timer, and confirms no overflow at desktop and 390px. Document the timer rules, completed-session sync behavior, device-local active timer, and required Supabase migration.

- [ ] **Step 5: Run the complete verification suite**

Run:

```bash
npm test -- --run
npm run lint
npx tsc --noEmit
npm run build
```

Expected: all commands exit 0 with no failed tests, lint errors, type errors, or build errors.

- [ ] **Step 6: Run browser verification**

Start the local server and inspect the Today view at desktop and 390px widths. Verify the timer restores after reload, remains stable while ticking, does not overlap task actions, and shows confirmation after an accelerated test session.

- [ ] **Step 7: Commit final integration**

```bash
git add src/state/workspace-provider.tsx src/features/settings.tsx tests/workbench.test.tsx tests/schema.test.ts e2e/workbench.spec.ts README.md
git commit -m "test: verify pomodoro workflow"
```

### Task 7: Prepare the local Demo without updating GitHub

**Files:**
- Verify only: all files changed by Tasks 1-6

- [ ] **Step 1: Confirm branch and worktree scope**

Run: `git status --short --branch && git log --oneline --decorate -8`

Expected: only intentional Pomodoro commits are present; the unrelated PDF remains untouched outside the feature worktree.

- [ ] **Step 2: Start a LAN-capable Demo server**

Run: `npm run dev -- --hostname 0.0.0.0 --port 3102`

Expected: Next.js reports a local URL and a network URL.

- [ ] **Step 3: Hand off the Demo for user review**

Provide the local Mac URL and same-network phone/Win10 URL. Do not push the feature branch, run the production Supabase migration, merge to `main`, or update GitHub Pages until the user approves the Demo.
