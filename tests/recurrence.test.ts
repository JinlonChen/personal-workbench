import { describe, expect, it } from "vitest";

import { createSeedWorkspace } from "@/data/seed";
import { fixedDueDates, reconcileRecurringWorkspace, recurrenceDate } from "@/domain/recurrence";
import type { RecurringPlan } from "@/domain/types";

const now = "2026-08-17T08:00:00.000Z";

function plan(patch: Partial<RecurringPlan> = {}): RecurringPlan {
  return {
    id: "00000000-0000-4000-8000-000000000001",
    title: "清理扫地机器人",
    description: "清理尘盒和滚刷",
    category: "life",
    startDate: "2026-08-17",
    interval: 1,
    unit: "month",
    mode: "fixed",
    missedPolicy: "latest_only",
    priority: "medium",
    inAppReminder: true,
    browserNotification: false,
    endDate: null,
    status: "active",
    completionAnchorDate: null,
    nextDueDate: "2026-08-17",
    createdAt: now,
    updatedAt: now,
    ...patch,
  };
}

describe("recurrence calendar", () => {
  it("keeps the original month-end and leap-year anchors", () => {
    expect(recurrenceDate("2026-01-31", 1, "month", 1)).toBe("2026-02-28");
    expect(recurrenceDate("2026-01-31", 1, "month", 2)).toBe("2026-03-31");
    expect(recurrenceDate("2024-02-29", 1, "year", 1)).toBe("2025-02-28");
    expect(recurrenceDate("2024-02-29", 1, "year", 4)).toBe("2028-02-29");
  });

  it("supports catch-up-all and latest-only policies", () => {
    expect(fixedDueDates(plan({ startDate: "2026-08-01", unit: "day", interval: 5, missedPolicy: "catch_up_all" }), "2026-08-17", new Set()).dueDates).toEqual(["2026-08-01", "2026-08-06", "2026-08-11", "2026-08-16"]);
    expect(fixedDueDates(plan({ startDate: "2026-08-01", unit: "day", interval: 5, missedPolicy: "latest_only" }), "2026-08-17", new Set()).dueDates).toEqual(["2026-08-16"]);
  });

  it("materializes one idempotent ordinary task", () => {
    const workspace = createSeedWorkspace("2026-08-17");
    workspace.tasks = [];
    workspace.recurringPlans = [plan()];
    const first = reconcileRecurringWorkspace(workspace, "2026-08-17", now);
    const second = reconcileRecurringWorkspace(first.workspace, "2026-08-17", now);
    expect(first.generatedCount).toBe(1);
    expect(first.workspace.tasks[0]).toMatchObject({ title: "清理扫地机器人", source: "recurring_plan", recurrenceDueDate: "2026-08-17" });
    expect(first.workspace.recurringOccurrences).toHaveLength(1);
    expect(second.generatedCount).toBe(0);
    expect(second.workspace.tasks).toHaveLength(1);
  });

  it("uses stable ids so multiple devices converge on one cloud row", () => {
    const workspace = createSeedWorkspace("2026-08-17");
    workspace.tasks = [];
    workspace.recurringPlans = [plan()];
    const mac = reconcileRecurringWorkspace(structuredClone(workspace), "2026-08-17", now).workspace;
    const win = reconcileRecurringWorkspace(structuredClone(workspace), "2026-08-17", "2026-08-17T08:00:01.000Z").workspace;

    expect(mac.tasks[0].id).toBe(win.tasks[0].id);
    expect(mac.recurringOccurrences[0].id).toBe(win.recurringOccurrences[0].id);
  });
});
