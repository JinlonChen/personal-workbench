import type {
  FocusProjectInput,
  LearningEntryInput,
  RecurringPlanInput,
  TaskInput,
  WorkEntryInput,
} from "@/domain/types";
import type { AssistantDraftAction } from "./protocol";

export interface AssistantActionHandlers {
  createTask(input: TaskInput): Promise<void>;
  createRecurringPlan(input: RecurringPlanInput): Promise<void>;
  createFocusProject(input: FocusProjectInput): Promise<void>;
  createWorkEntry(input: WorkEntryInput): Promise<void>;
  createLearningEntry(input: LearningEntryInput): Promise<void>;
}

export async function executeAssistantAction(
  action: AssistantDraftAction,
  handlers: AssistantActionHandlers,
): Promise<void> {
  switch (action.type) {
    case "create_task":
      await handlers.createTask({
        ...action.data,
        status: "todo",
        placement: "scheduled",
        backlogKind: null,
        originalTaskDate: null,
      });
      return;
    case "create_backlog_task":
      await handlers.createTask({
        ...action.data,
        status: "todo",
        placement: "backlog",
        backlogKind: "unscheduled",
        originalTaskDate: null,
      });
      return;
    case "create_recurring_plan":
      await handlers.createRecurringPlan({
        ...action.data,
        inAppReminder: true,
        browserNotification: false,
      });
      return;
    case "create_focus_project":
      await handlers.createFocusProject(action.data);
      return;
    case "create_work_entry":
      await handlers.createWorkEntry({ ...action.data, taskId: null });
      return;
    case "create_learning_entry":
      await handlers.createLearningEntry(action.data);
  }
}
