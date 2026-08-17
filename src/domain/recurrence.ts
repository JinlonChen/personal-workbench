import type {
  RecurrenceUnit,
  RecurringOccurrence,
  RecurringPlan,
  Workspace,
  WorkspaceTask,
} from "./types";

function parseDate(date: string): Date {
  const value = new Date(`${date}T12:00:00.000Z`);
  if (Number.isNaN(value.getTime())) throw new Error("日期格式无效");
  return value;
}

function dateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function daysInMonth(year: number, monthIndex: number): number {
  return new Date(Date.UTC(year, monthIndex + 1, 0, 12)).getUTCDate();
}

export function recurrenceDate(anchor: string, interval: number, unit: RecurrenceUnit, occurrenceIndex: number): string {
  if (!Number.isInteger(interval) || interval < 1) throw new Error("周期数字必须是大于 0 的整数");
  if (!Number.isInteger(occurrenceIndex) || occurrenceIndex < 0) throw new Error("期次序号无效");
  const source = parseDate(anchor);
  const steps = interval * occurrenceIndex;
  if (unit === "day" || unit === "week") {
    const result = new Date(source);
    result.setUTCDate(result.getUTCDate() + steps * (unit === "week" ? 7 : 1));
    return dateKey(result);
  }
  const months = steps * (unit === "quarter" ? 3 : unit === "year" ? 12 : 1);
  const monthIndex = source.getUTCMonth() + months;
  const year = source.getUTCFullYear() + Math.floor(monthIndex / 12);
  const month = ((monthIndex % 12) + 12) % 12;
  const day = Math.min(source.getUTCDate(), daysInMonth(year, month));
  return dateKey(new Date(Date.UTC(year, month, day, 12)));
}

export function nextRecurringDate(anchor: string, interval: number, unit: RecurrenceUnit): string {
  return recurrenceDate(anchor, interval, unit, 1);
}

export function recurrenceLabel(plan: Pick<RecurringPlan, "interval" | "unit" | "mode">): string {
  const units: Record<RecurrenceUnit, string> = { day: "天", week: "周", month: "月", quarter: "季度", year: "年" };
  const mode = plan.mode === "fixed" ? "固定日期循环" : "完成后重新计时";
  return `每 ${plan.interval} ${units[plan.unit]} · ${mode}`;
}

function stableId(prefix: string, planId: string, dueDate: string): string {
  let first = 2166136261;
  let second = 16777619;
  for (const character of `${prefix}:${planId}:${dueDate}`) {
    first ^= character.charCodeAt(0);
    first = Math.imul(first, 16777619);
    second ^= character.charCodeAt(0) + 31;
    second = Math.imul(second, 2166136261);
  }
  const hex = (value: number) => (value >>> 0).toString(16).padStart(8, "0");
  const a = hex(first);
  const b = hex(second);
  return `${a}-${b.slice(0, 4)}-4${b.slice(4, 7)}-${a.slice(0, 4)}-${b}${a.slice(4)}`;
}

export interface DueDateResult {
  dueDates: string[];
  nextDueDate: string | null;
  overflow: boolean;
}

export function fixedDueDates(
  plan: RecurringPlan,
  today: string,
  existingDueDates: ReadonlySet<string>,
  limit = 100,
): DueDateResult {
  const dueDates: string[] = [];
  let latestCandidate: string | null = null;
  let nextDueDate: string | null = null;
  let index = 0;
  let overflow = false;
  while (index < 10000) {
    const candidate = recurrenceDate(plan.startDate, plan.interval, plan.unit, index);
    if (plan.endDate && candidate > plan.endDate) break;
    if (candidate > today) {
      nextDueDate = candidate;
      break;
    }
    latestCandidate = candidate;
    if (plan.missedPolicy === "latest_only") {
      index += 1;
      continue;
    }
    if (!existingDueDates.has(candidate)) {
      if (dueDates.length >= limit) overflow = true;
      else dueDates.push(candidate);
    }
    index += 1;
  }
  if (plan.missedPolicy === "latest_only" && latestCandidate && !existingDueDates.has(latestCandidate)) {
    dueDates.push(latestCandidate);
  }
  if (!nextDueDate && latestCandidate) {
    const candidate = recurrenceDate(plan.startDate, plan.interval, plan.unit, index);
    nextDueDate = plan.endDate && candidate > plan.endDate ? null : candidate;
  }
  return { dueDates, nextDueDate, overflow };
}

function latestOccurrence(occurrences: RecurringOccurrence[], planId: string): RecurringOccurrence | undefined {
  return occurrences
    .filter((occurrence) => occurrence.recurringPlanId === planId)
    .sort((left, right) => right.dueDate.localeCompare(left.dueDate))[0];
}

function occurrenceExists(occurrences: RecurringOccurrence[], planId: string, dueDate: string): boolean {
  return occurrences.some((occurrence) => occurrence.recurringPlanId === planId && occurrence.dueDate === dueDate);
}

export interface RecurrenceReconcileResult {
  workspace: Workspace;
  generatedCount: number;
  overflowPlanIds: string[];
}

export function reconcileRecurringWorkspace(workspace: Workspace, today: string, now = new Date().toISOString()): RecurrenceReconcileResult {
  let tasks = workspace.tasks;
  let occurrences = workspace.recurringOccurrences;
  let plans = workspace.recurringPlans;
  let generatedCount = 0;
  const overflowPlanIds: string[] = [];
  let changed = false;

  for (const plan of workspace.recurringPlans) {
    if (plan.status !== "active") continue;
    const existingDates = new Set(occurrences.filter((item) => item.recurringPlanId === plan.id).map((item) => item.dueDate));
    let dueDates: string[] = [];
    let nextDueDate: string | null = plan.nextDueDate;

    if (plan.mode === "fixed") {
      const result = fixedDueDates(plan, today, existingDates);
      dueDates = result.dueDates;
      nextDueDate = result.nextDueDate;
      if (result.overflow) overflowPlanIds.push(plan.id);
    } else {
      const latest = latestOccurrence(occurrences, plan.id);
      let candidate: string | null = null;
      if (!latest) candidate = plan.startDate;
      else if (latest.status !== "generated") {
        const anchor = plan.completionAnchorDate ?? latest.resolvedAt?.slice(0, 10) ?? latest.dueDate;
        candidate = recurrenceDate(anchor, plan.interval, plan.unit, 1);
      }
      if (candidate && (!plan.endDate || candidate <= plan.endDate)) {
        nextDueDate = candidate;
        if (candidate <= today && !existingDates.has(candidate)) dueDates = [candidate];
      } else if (candidate) {
        nextDueDate = null;
      } else {
        nextDueDate = plan.nextDueDate;
      }
    }

    if (nextDueDate !== plan.nextDueDate) {
      plans = plans.map((item) => item.id === plan.id ? { ...item, nextDueDate, updatedAt: now } : item);
      changed = true;
    }

    for (const dueDate of dueDates) {
      if (occurrenceExists(occurrences, plan.id, dueDate)) continue;
      const occurrenceId = stableId("occurrence", plan.id, dueDate);
      const taskId = stableId("task", plan.id, dueDate);
      const occurrence: RecurringOccurrence = {
        id: occurrenceId,
        recurringPlanId: plan.id,
        dueDate,
        taskId,
        status: "generated",
        resolvedAt: null,
        createdAt: now,
        updatedAt: now,
      };
      const task: WorkspaceTask = {
        id: taskId,
        title: plan.title,
        description: plan.description,
        taskDate: dueDate,
        placement: "scheduled",
        backlogKind: null,
        originalTaskDate: null,
        priority: plan.priority,
        status: "todo",
        source: "recurring_plan",
        recurringPlanId: plan.id,
        recurrenceDueDate: dueDate,
        createdAt: now,
        updatedAt: now,
      };
      occurrences = [occurrence, ...occurrences];
      tasks = [task, ...tasks];
      generatedCount += 1;
      changed = true;
    }
  }

  return {
    workspace: changed ? { ...workspace, tasks, recurringPlans: plans, recurringOccurrences: occurrences } : workspace,
    generatedCount,
    overflowPlanIds,
  };
}

export function statusForRecurringTask(status: WorkspaceTask["status"] | "deleted"): RecurringOccurrence["status"] {
  if (status === "done") return "completed";
  if (status === "cancelled") return "cancelled";
  if (status === "deleted") return "deleted";
  return "generated";
}
