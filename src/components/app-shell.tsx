"use client";

import {
  CalendarDays,
  CheckSquare2,
  NotebookPen,
  Settings,
  Sparkles,
  SunMedium,
  Target,
  RefreshCcw,
} from "lucide-react";
import { useState } from "react";
import { useEffect } from "react";

import { formatDate, todayKey } from "@/domain/date";
import { TasksView } from "@/features/tasks";
import { TodayView } from "@/features/today";
import { RecordsView } from "@/features/records";
import { ReviewsView } from "@/features/reviews";
import { SettingsView } from "@/features/settings";
import { FocusView } from "@/features/focus";
import { RecurringView } from "@/features/recurring";
import { useWorkspace } from "@/state/workspace-provider";
import { recurringSummary } from "@/domain/selectors";
import { notifyDueRecurringTasks } from "@/features/recurring-notifications";

type View = "today" | "focus" | "tasks" | "recurring" | "records" | "reviews" | "settings";

const navItems = [
  { id: "today", label: "今日", icon: SunMedium },
  { id: "focus", label: "关注", icon: Target },
  { id: "tasks", label: "任务", icon: CheckSquare2 },
  { id: "recurring", label: "周期", icon: RefreshCcw },
  { id: "records", label: "记录", icon: NotebookPen },
  { id: "reviews", label: "复盘", icon: CalendarDays },
  { id: "settings", label: "设置", icon: Settings },
] as const;

function ViewPlaceholder({ view, onNavigate }: { view: View; onNavigate: (view: View) => void }) {
  const headings: Record<View, string> = {
    today: "今日工作台",
    focus: "重点关注",
    tasks: "任务",
    recurring: "周期任务",
    records: "记录",
    reviews: "每日复盘",
    settings: "设置",
  };
  if (view === "today") return <TodayView onNavigate={onNavigate} />;
  if (view === "focus") return <FocusView />;
  if (view === "tasks") return <TasksView />;
  if (view === "recurring") return <RecurringView />;
  if (view === "records") return <RecordsView />;
  if (view === "reviews") return <ReviewsView />;
  if (view === "settings") return <SettingsView />;
  return (
    <section className="view-placeholder">
      <h1>{headings[view]}</h1>
    </section>
  );
}

export function AppShell() {
  const { workspace, saveStatus, syncMode } = useWorkspace();
  const [view, setView] = useState<View>("today");
  const date = todayKey(workspace.profile.timezone);
  const recurringDue = recurringSummary(workspace.recurringPlans, workspace.tasks, date).dueToday;

  useEffect(() => {
    notifyDueRecurringTasks(window.localStorage, workspace.recurringPlans, workspace.tasks, date);
  }, [date, workspace.recurringPlans, workspace.tasks]);

  return (
    <div className="app-shell">
      <header className="mobile-header">
        <div>
          <span className="eyebrow">一页</span>
          <strong>{formatDate(date)}</strong>
        </div>
        <span className={`save-indicator save-${saveStatus}`}>{saveStatus === "saving" ? "保存中" : syncMode === "cloud" ? "云端同步" : "本地模式"}</span>
      </header>

      <nav className="primary-nav" aria-label="主要导航">
        <div className="brand-lockup">
          <span className="brand-mark"><Sparkles size={18} /></span>
          <div><strong>一页</strong><span>个人工作台</span></div>
        </div>
        <div className="nav-date"><span>{formatDate(date)}</span><small>把今天写清楚</small></div>
        <div className="nav-items">
          {navItems.map(({ id, label, icon: Icon }) => (
            <button
              className={view === id ? "nav-button active" : "nav-button"}
              key={id}
              onClick={() => setView(id)}
              type="button"
              aria-current={view === id ? "page" : undefined}
            >
              <Icon size={18} aria-hidden="true" />
              <span>{label}</span>
              {id === "recurring" && recurringDue > 0 ? <span className="nav-count" aria-hidden="true">{recurringDue}</span> : null}
            </button>
          ))}
        </div>
        <div className="local-note"><span className="status-dot" />{syncMode === "cloud" ? "已同步到云端" : "数据仅保存在此浏览器"}</div>
      </nav>

      <main className="app-content">
        <ViewPlaceholder view={view} onNavigate={setView} />
      </main>
    </div>
  );
}
