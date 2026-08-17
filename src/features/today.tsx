"use client";

import { ArrowRight, BookOpen, BriefcaseBusiness, CheckCircle2, Plus, RefreshCcw, Sunrise } from "lucide-react";

import { PageHeader, SaveIndicator } from "@/components/ui";
import { formatDate, todayKey } from "@/domain/date";
import { completionRate, tasksForDate } from "@/domain/selectors";
import { useWorkspace } from "@/state/workspace-provider";
import { TaskList } from "./tasks";
import { PomodoroTimer } from "./pomodoro-timer";

export function TodayView({ onNavigate }: { onNavigate: (view: "tasks" | "records" | "reviews" | "recurring") => void }) {
  const { workspace, saveStatus, syncMode } = useWorkspace();
  const date = todayKey(workspace.profile.timezone);
  const tasks = tasksForDate(workspace.tasks, date);
  const focus = tasks.filter((task) => task.status !== "done" && task.status !== "cancelled").slice(0, 3);
  const rate = completionRate(workspace.tasks, date);
  const recurringDue = tasks.filter((task) => task.source === "recurring_plan" && task.status !== "done" && task.status !== "cancelled").length;

  return (
    <section className="view-page today-page">
      <PageHeader eyebrow={formatDate(date)} title="今日工作台" description={`${workspace.profile.displayName}，把今天最重要的事情写清楚。`} action={<SaveIndicator status={saveStatus} mode={syncMode} />} />
      {recurringDue > 0 ? <section className="recurring-due-band"><RefreshCcw size={18} /><div><strong>今天有 {recurringDue} 项周期任务</strong><span>已自动加入今日任务。</span></div><button className="text-button" type="button" onClick={() => onNavigate("recurring")}>查看周期</button></section> : null}
      <section className="focus-band">
        <div className="focus-icon"><Sunrise size={20} /></div>
        <div className="focus-content"><span>今日最重要</span>{focus.length ? focus.map((task) => <strong key={task.id}>{task.title}</strong>) : <strong>今天的关键事项已完成</strong>}</div>
        <button className="icon-button" type="button" aria-label="管理今日任务" onClick={() => onNavigate("tasks")}><ArrowRight size={18} /></button>
      </section>
      <PomodoroTimer date={date} tasks={tasks} />
      <section className="content-section">
        <div className="section-heading"><div><h2>今日任务</h2><p>{tasks.filter((task) => task.status === "done").length} / {tasks.filter((task) => task.status !== "cancelled").length} 已完成</p></div><button className="text-button" type="button" onClick={() => onNavigate("tasks")}><Plus size={16} />添加任务</button></div>
        <div className="progress-track" aria-label={`今日完成度 ${rate}%`}><span style={{ width: `${rate}%` }} /></div>
        <TaskList tasks={tasks} focusSessions={workspace.focusSessions} />
      </section>
      <section className="content-section">
        <div className="section-heading"><div><h2>快速记录</h2><p>及时留下完成和收获，不依赖晚上回忆。</p></div></div>
        <div className="quick-grid">
          <button className="quick-action" type="button" onClick={() => onNavigate("records")}><span className="quick-icon work"><BriefcaseBusiness size={20} /></span><span><strong>工作记录</strong><small>刚刚完成了什么？</small></span><ArrowRight size={17} /></button>
          <button className="quick-action" type="button" onClick={() => onNavigate("records")}><span className="quick-icon learn"><BookOpen size={20} /></span><span><strong>学习记录</strong><small>今天学到了什么？</small></span><ArrowRight size={17} /></button>
        </div>
      </section>
      <section className="review-callout"><div><span className="review-icon"><CheckCircle2 size={20} /></span><div><h2>结束今天之前</h2><p>用两分钟整理收获、阻碍与明日重点。</p></div></div><button className="button secondary" type="button" onClick={() => onNavigate("reviews")}>开始复盘<ArrowRight size={16} /></button></section>
    </section>
  );
}
