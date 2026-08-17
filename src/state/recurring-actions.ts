import { statusForRecurringTask } from "@/domain/recurrence";
import type { RecurringPlanInput, Workspace, WorkspaceTask } from "@/domain/types";

export function buildRecurringPlan(workspace: Workspace, input: RecurringPlanInput, id: string, now: string): Workspace {
  return {
    ...workspace,
    recurringPlans: [{
      ...input,
      id,
      status: "active",
      completionAnchorDate: null,
      nextDueDate: input.startDate,
      createdAt: now,
      updatedAt: now,
    }, ...workspace.recurringPlans],
  };
}

export function updateRecurringPlan(workspace: Workspace, id: string, input: RecurringPlanInput, now: string): Workspace {
  return {
    ...workspace,
    recurringPlans: workspace.recurringPlans.map((plan) => plan.id === id ? {
      ...plan,
      ...input,
      nextDueDate: plan.nextDueDate ?? input.startDate,
      updatedAt: now,
    } : plan),
  };
}

export function setRecurringPlanStatus(workspace: Workspace, id: string, status: "active" | "paused" | "terminated", now: string): Workspace {
  return {
    ...workspace,
    recurringPlans: workspace.recurringPlans.map((plan) => plan.id === id ? {
      ...plan,
      status,
      nextDueDate: status === "terminated" ? null : plan.nextDueDate ?? plan.startDate,
      updatedAt: now,
    } : plan),
  };
}

export function syncRecurringTaskStatus(workspace: Workspace, task: WorkspaceTask, nextStatus: WorkspaceTask["status"] | "deleted", now: string): Workspace {
  if (!task.recurringPlanId) return workspace;
  const occurrenceStatus = statusForRecurringTask(nextStatus);
  const resolved = occurrenceStatus === "generated" ? null : now;
  const occurrences = workspace.recurringOccurrences.map((occurrence) => occurrence.taskId === task.id ? {
    ...occurrence,
    taskId: nextStatus === "deleted" ? null : occurrence.taskId,
    status: occurrenceStatus,
    resolvedAt: resolved,
    updatedAt: now,
  } : occurrence);
  const plan = workspace.recurringPlans.find((item) => item.id === task.recurringPlanId);
  const latestResolved = occurrences
    .filter((occurrence) => occurrence.recurringPlanId === task.recurringPlanId && occurrence.status !== "generated")
    .sort((left, right) => (right.resolvedAt ?? "").localeCompare(left.resolvedAt ?? ""))[0];
  return {
    ...workspace,
    recurringOccurrences: occurrences,
    recurringPlans: plan && plan.mode === "after_completion" ? workspace.recurringPlans.map((item) => item.id === plan.id ? {
      ...item,
      completionAnchorDate: latestResolved?.resolvedAt?.slice(0, 10) ?? null,
      updatedAt: now,
    } : item) : workspace.recurringPlans,
  };
}
