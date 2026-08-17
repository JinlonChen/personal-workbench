"use client";

import { CalendarClock, CirclePause, CirclePlay, Pencil, Plus, RefreshCcw, SkipForward, Square } from "lucide-react";
import { type FormEvent, useMemo, useState } from "react";

import { ConfirmDialog, EmptyState, Modal, PageHeader, SaveIndicator } from "@/components/ui";
import { formatDate, todayKey } from "@/domain/date";
import { recurrenceLabel } from "@/domain/recurrence";
import { recurringSummary } from "@/domain/selectors";
import type {
  MissedOccurrencePolicy,
  RecurrenceMode,
  RecurrenceUnit,
  RecurringCategory,
  RecurringPlan,
  RecurringPlanInput,
  TaskPriority,
} from "@/domain/types";
import { useWorkspace } from "@/state/workspace-provider";
import { requestRecurringNotificationPermission } from "./recurring-notifications";

const unitLabels: Record<RecurrenceUnit, string> = { day: "天", week: "周", month: "月", quarter: "季度", year: "年" };
const statusLabels = { active: "进行中", paused: "已暂停", terminated: "已终止" } as const;

function PlanForm({ plan, onClose }: { plan?: RecurringPlan; onClose: () => void }) {
  const { createRecurringPlan, updateRecurringPlan, error } = useWorkspace();
  const today = todayKey();
  const [title, setTitle] = useState(plan?.title ?? "");
  const [description, setDescription] = useState(plan?.description ?? "");
  const [category, setCategory] = useState<RecurringCategory>(plan?.category ?? "life");
  const [startDate, setStartDate] = useState(plan?.startDate ?? today);
  const [interval, setInterval] = useState(plan?.interval ?? 1);
  const [unit, setUnit] = useState<RecurrenceUnit>(plan?.unit ?? "month");
  const [mode, setMode] = useState<RecurrenceMode>(plan?.mode ?? "fixed");
  const [missedPolicy, setMissedPolicy] = useState<MissedOccurrencePolicy>(plan?.missedPolicy ?? "latest_only");
  const [priority, setPriority] = useState<TaskPriority>(plan?.priority ?? "medium");
  const [inAppReminder, setInAppReminder] = useState(plan?.inAppReminder ?? true);
  const [browserNotification, setBrowserNotification] = useState(plan?.browserNotification ?? false);
  const [endDate, setEndDate] = useState(plan?.endDate ?? "");
  const [validation, setValidation] = useState("");

  async function changeBrowserNotification(enabled: boolean) {
    if (!enabled) {
      setBrowserNotification(false);
      return;
    }
    const allowed = await requestRecurringNotificationPermission();
    setBrowserNotification(allowed);
    if (!allowed) setValidation("浏览器通知未开启；页面提醒和自动生成任务仍会正常工作。");
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!title.trim()) return setValidation("请输入周期任务名称");
    if (!Number.isInteger(interval) || interval < 1) return setValidation("周期数字必须是大于 0 的整数");
    if (endDate && endDate < startDate) return setValidation("结束日期不能早于首次执行日期");
    const input: RecurringPlanInput = {
      title: title.trim(), description: description.trim(), category, startDate, interval, unit, mode,
      missedPolicy: mode === "fixed" ? missedPolicy : null, priority, inAppReminder, browserNotification,
      endDate: endDate || null,
    };
    try {
      if (plan) await updateRecurringPlan(plan.id, input);
      else await createRecurringPlan(input);
      onClose();
    } catch {
      // The provider exposes the persistence error while preserving the form.
    }
  }

  const summary = `从 ${startDate} 开始，每 ${interval} ${unitLabels[unit]}生成一次；${mode === "fixed" ? `按固定日期循环；漏期时${missedPolicy === "catch_up_all" ? "每期都补" : "只保留最近一期"}` : "完成后重新计时"}。`;

  return <Modal title={plan ? "编辑周期任务" : "新建周期任务"} onClose={onClose}><form className="form-stack recurring-form" onSubmit={submit}>
    <label className="field"><span>周期任务名称</span><input aria-label="周期任务名称" autoFocus value={title} onChange={(event) => setTitle(event.target.value)} /></label>
    <label className="field"><span>说明 <small>可选</small></span><textarea rows={3} value={description} onChange={(event) => setDescription(event.target.value)} /></label>
    <div className="form-grid"><label className="field"><span>分类</span><select value={category} onChange={(event) => setCategory(event.target.value as RecurringCategory)}><option value="work">工作</option><option value="life">生活</option></select></label><label className="field"><span>首次执行日期</span><input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} /></label></div>
    <div className="form-grid"><label className="field"><span>周期数字</span><input type="number" min="1" step="1" value={interval} onChange={(event) => setInterval(Number(event.target.value))} /></label><label className="field"><span>周期单位</span><select value={unit} onChange={(event) => setUnit(event.target.value as RecurrenceUnit)}>{Object.entries(unitLabels).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label></div>
    <label className="field"><span>计算基准</span><select value={mode} onChange={(event) => setMode(event.target.value as RecurrenceMode)}><option value="fixed">固定日期循环</option><option value="after_completion">完成后重新计时</option></select></label>
    {mode === "fixed" ? <label className="field"><span>漏期处理</span><select value={missedPolicy} onChange={(event) => setMissedPolicy(event.target.value as MissedOccurrencePolicy)}><option value="latest_only">只保留最近一期</option><option value="catch_up_all">每期都要补</option></select></label> : null}
    <div className="form-grid"><label className="field"><span>任务优先级</span><select value={priority} onChange={(event) => setPriority(event.target.value as TaskPriority)}><option value="high">高</option><option value="medium">中</option><option value="low">低</option></select></label><label className="field"><span>结束日期 <small>可选</small></span><input type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} /></label></div>
    <div className="recurring-options"><label><input type="checkbox" checked={inAppReminder} onChange={(event) => setInAppReminder(event.target.checked)} />页面提醒</label><label><input type="checkbox" checked={browserNotification} onChange={(event) => void changeBrowserNotification(event.target.checked)} />浏览器通知</label></div>
    <p className="recurring-form-summary">{summary}</p>
    {validation || error ? <p className="form-error" role="alert">{validation || error}</p> : null}
    <div className="form-actions"><button className="button secondary" type="button" onClick={onClose}>取消</button><button className="button primary" type="submit">保存周期任务</button></div>
  </form></Modal>;
}

function PlanRow({ plan }: { plan: RecurringPlan }) {
  const { workspace, pauseRecurringPlan, resumeRecurringPlan, skipRecurringPlanOccurrence, terminateRecurringPlan } = useWorkspace();
  const [editing, setEditing] = useState(false);
  const [terminating, setTerminating] = useState(false);
  const hasOpenOccurrence = workspace.recurringOccurrences.some((occurrence) => occurrence.recurringPlanId === plan.id && occurrence.status === "generated");
  return <><article className="recurring-row"><div className="recurring-row-icon"><RefreshCcw size={18} /></div><div className="recurring-row-copy"><div><h3>{plan.title}</h3><span className={`badge recurring-status-${plan.status}`}>{statusLabels[plan.status]}</span><span className="badge">{plan.category === "work" ? "工作" : "生活"}</span></div><p>{recurrenceLabel(plan)}</p><small>{plan.nextDueDate ? `下次：${formatDate(plan.nextDueDate)}` : "没有后续期次"}{plan.mode === "fixed" ? ` · ${plan.missedPolicy === "catch_up_all" ? "每期都补" : "只保留最近一期"}` : ""}</small></div><div className="row-actions">{hasOpenOccurrence ? <button className="icon-button" type="button" title="跳过当前一期" aria-label={`跳过 ${plan.title}`} onClick={() => skipRecurringPlanOccurrence(plan.id)}><SkipForward size={17} /></button> : null}{plan.status === "active" ? <button className="icon-button" type="button" title="暂停" aria-label={`暂停 ${plan.title}`} onClick={() => pauseRecurringPlan(plan.id)}><CirclePause size={18} /></button> : null}{plan.status === "paused" ? <button className="icon-button" type="button" title="恢复" aria-label={`恢复 ${plan.title}`} onClick={() => resumeRecurringPlan(plan.id)}><CirclePlay size={18} /></button> : null}{plan.status !== "terminated" ? <button className="icon-button" type="button" title="编辑" aria-label={`编辑 ${plan.title}`} onClick={() => setEditing(true)}><Pencil size={17} /></button> : null}{plan.status !== "terminated" ? <button className="icon-button danger-text" type="button" title="终止" aria-label={`终止 ${plan.title}`} onClick={() => setTerminating(true)}><Square size={17} /></button> : null}</div></article>{editing ? <PlanForm plan={plan} onClose={() => setEditing(false)} /> : null}{terminating ? <ConfirmDialog title="确认终止周期任务" description={`“${plan.title}”以后不再自动生成任务，已有任务和历史会保留。`} confirmLabel="确认终止" onCancel={() => setTerminating(false)} onConfirm={() => terminateRecurringPlan(plan.id)} /> : null}</>;
}

export function RecurringView() {
  const { workspace, saveStatus, syncMode } = useWorkspace();
  const [creating, setCreating] = useState(false);
  const [filter, setFilter] = useState<"active" | "paused" | "terminated" | "all">("active");
  const today = todayKey(workspace.profile.timezone);
  const summary = recurringSummary(workspace.recurringPlans, workspace.tasks, today);
  const plans = useMemo(() => workspace.recurringPlans.filter((plan) => filter === "all" || plan.status === filter).sort((a, b) => (a.nextDueDate ?? "9999").localeCompare(b.nextDueDate ?? "9999")), [filter, workspace.recurringPlans]);
  return <section className="view-page recurring-page"><PageHeader eyebrow="规律与提醒" title="周期任务" description="把需要定期完成的事情交给工作台安排。" action={<button className="button primary" type="button" onClick={() => setCreating(true)}><Plus size={17} />新建周期</button>} />
    <div className="recurring-summary"><div><strong>{summary.dueToday}</strong><span>今日到期</span></div><div><strong>{summary.nextSevenDays}</strong><span>未来 7 天</span></div><div><strong>{summary.overdue}</strong><span>已逾期</span></div><div><strong>{summary.paused}</strong><span>已暂停</span></div></div>
    <div className="toolbar recurring-toolbar"><div className="segmented"><button className={filter === "active" ? "active" : ""} onClick={() => setFilter("active")} type="button">进行中</button><button className={filter === "paused" ? "active" : ""} onClick={() => setFilter("paused")} type="button">已暂停</button><button className={filter === "terminated" ? "active" : ""} onClick={() => setFilter("terminated")} type="button">已终止</button><button className={filter === "all" ? "active" : ""} onClick={() => setFilter("all")} type="button">全部</button></div><div className="toolbar-spacer" /><SaveIndicator status={saveStatus} mode={syncMode} /></div>
    {plans.length ? <div className="recurring-list">{plans.map((plan) => <PlanRow key={plan.id} plan={plan} />)}</div> : <EmptyState icon={<CalendarClock size={22} />} title="还没有周期任务" description="添加一件需要按固定规律完成的事。" />}
    {creating ? <PlanForm onClose={() => setCreating(false)} /> : null}
  </section>;
}
