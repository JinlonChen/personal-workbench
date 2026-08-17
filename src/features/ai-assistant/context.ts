import { todayKey } from "@/domain/date";
import type { Workspace } from "@/domain/types";

export interface AssistantContext {
  today: string;
  timezone: string;
  periods: {
    week: { start: string; end: string };
    month: { start: string; end: string };
  };
  tasks: Array<{
    title: string;
    description: string;
    taskDate: string;
    placement: "scheduled" | "backlog";
    backlogKind: "unscheduled" | "unexecuted" | null;
    priority: "high" | "medium" | "low";
    status: "todo" | "doing" | "done" | "cancelled";
  }>;
  focusProjects: Array<{
    name: string;
    tier: "top" | "parallel" | "paused";
    status: "on_track" | "attention" | "blocked";
    currentGoal: string;
    risk: string;
    nextAction: string;
    latestConclusion: string;
    nextReviewDate: string;
  }>;
  recurringPlans: Array<{
    title: string;
    description: string;
    category: "work" | "life";
    startDate: string;
    interval: number;
    unit: "day" | "week" | "month" | "quarter" | "year";
    mode: "fixed" | "after_completion";
    status: "active" | "paused" | "terminated";
    nextDueDate: string | null;
  }>;
  workEntries: Array<{ entryDate: string; title: string; content: string; result: string; tags: string[] }>;
  learningEntries: Array<{
    entryDate: string;
    title: string;
    content: string;
    keyPoints: string;
    nextAction: string;
    tags: string[];
  }>;
}

function utcDate(date: string): Date {
  const result = new Date(`${date}T12:00:00.000Z`);
  if (Number.isNaN(result.getTime()) || result.toISOString().slice(0, 10) !== date) throw new Error("日期格式无效");
  return result;
}

function dateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function addDays(date: Date, count: number): Date {
  const result = new Date(date);
  result.setUTCDate(result.getUTCDate() + count);
  return result;
}

function periods(today: string) {
  const current = utcDate(today);
  const weekday = current.getUTCDay() || 7;
  const weekStart = addDays(current, 1 - weekday);
  const monthStart = new Date(Date.UTC(current.getUTCFullYear(), current.getUTCMonth(), 1, 12));
  const monthEnd = new Date(Date.UTC(current.getUTCFullYear(), current.getUTCMonth() + 1, 0, 12));
  return {
    week: { start: dateKey(weekStart), end: dateKey(addDays(weekStart, 6)) },
    month: { start: dateKey(monthStart), end: dateKey(monthEnd) },
  };
}

function recent<T extends { entryDate: string }>(items: T[], limit: number): T[] {
  return [...items].sort((left, right) => right.entryDate.localeCompare(left.entryDate)).slice(0, limit);
}

function truncate(value: string, limit = 240): string {
  return value.slice(0, limit);
}

export function buildAssistantContext(
  workspace: Workspace,
  today = todayKey(workspace.profile.timezone),
): AssistantContext {
  return {
    today,
    timezone: workspace.profile.timezone,
    periods: periods(today),
    tasks: workspace.tasks.slice(0, 200).map((task) => ({
      title: task.title,
      description: truncate(task.description),
      taskDate: task.taskDate,
      placement: task.placement,
      backlogKind: task.backlogKind,
      priority: task.priority,
      status: task.status,
    })),
    focusProjects: workspace.focusProjects.slice(0, 50).map((project) => ({
      name: project.name,
      tier: project.tier,
      status: project.status,
      currentGoal: truncate(project.currentGoal),
      risk: truncate(project.risk),
      nextAction: truncate(project.nextAction),
      latestConclusion: truncate(project.latestConclusion),
      nextReviewDate: project.nextReviewDate,
    })),
    recurringPlans: workspace.recurringPlans.slice(0, 50).map((plan) => ({
      title: plan.title,
      description: truncate(plan.description),
      category: plan.category,
      startDate: plan.startDate,
      interval: plan.interval,
      unit: plan.unit,
      mode: plan.mode,
      status: plan.status,
      nextDueDate: plan.nextDueDate,
    })),
    workEntries: recent(workspace.workEntries, 30).map((entry) => ({
      entryDate: entry.entryDate,
      title: entry.title,
      content: truncate(entry.content),
      result: truncate(entry.result),
      tags: entry.tags.slice(0, 10),
    })),
    learningEntries: recent(workspace.learningEntries, 30).map((entry) => ({
      entryDate: entry.entryDate,
      title: entry.title,
      content: truncate(entry.content),
      keyPoints: truncate(entry.keyPoints),
      nextAction: truncate(entry.nextAction),
      tags: entry.tags.slice(0, 10),
    })),
  };
}
