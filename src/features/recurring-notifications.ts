import type { RecurringPlan, WorkspaceTask } from "@/domain/types";

const PREFIX = "personal-workbench.recurring-notification.v1";

export async function requestRecurringNotificationPermission(): Promise<boolean> {
  if (typeof Notification === "undefined") return false;
  if (Notification.permission === "granted") return true;
  if (Notification.permission === "denied") return false;
  return (await Notification.requestPermission()) === "granted";
}

export function notifyDueRecurringTasks(storage: Storage, plans: RecurringPlan[], tasks: WorkspaceTask[], today: string): number {
  if (typeof Notification === "undefined" || Notification.permission !== "granted") return 0;
  let count = 0;
  for (const task of tasks) {
    if (task.source !== "recurring_plan" || task.recurrenceDueDate !== today || task.status === "done" || task.status === "cancelled") continue;
    const plan = plans.find((item) => item.id === task.recurringPlanId);
    if (!plan?.browserNotification) continue;
    const key = `${PREFIX}.${plan.id}.${task.recurrenceDueDate}`;
    if (storage.getItem(key)) continue;
    new Notification("周期任务到期", { body: task.title });
    storage.setItem(key, "sent");
    count += 1;
  }
  return count;
}
