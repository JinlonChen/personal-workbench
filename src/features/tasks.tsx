"use client";

import { CalendarPlus, CheckCircle2, Pencil, Plus, Trash2, XCircle } from "lucide-react";
import { type FormEvent, useState } from "react";

import { ConfirmDialog, EmptyState, Modal, PageHeader, SaveIndicator } from "@/components/ui";
import { formatDate, todayKey } from "@/domain/date";
import { focusMinutesForTask, tasksForDate } from "@/domain/selectors";
import type { FocusSession, TaskInput, TaskPriority, TaskStatus, WorkspaceTask } from "@/domain/types";
import { useWorkspace } from "@/state/workspace-provider";

const statusLabels: Record<TaskStatus, string> = {
  todo: "未开始",
  doing: "进行中",
  done: "已完成",
  cancelled: "已取消",
};

const priorityLabels: Record<TaskPriority, string> = { high: "高", medium: "中", low: "低" };

function TaskForm({ task, date, onClose }: { task?: WorkspaceTask; date: string; onClose: () => void }) {
  const { createTask, updateTask, error } = useWorkspace();
  const [title, setTitle] = useState(task?.title ?? "");
  const [description, setDescription] = useState(task?.description ?? "");
  const [taskDate, setTaskDate] = useState(task?.taskDate ?? date);
  const [priority, setPriority] = useState<TaskPriority>(task?.priority ?? "medium");
  const [status, setStatus] = useState<TaskStatus>(task?.status ?? "todo");
  const [validation, setValidation] = useState("");

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!title.trim()) {
      setValidation("请输入任务标题");
      return;
    }
    const input: TaskInput = { title: title.trim(), description: description.trim(), taskDate, priority, status };
    try {
      if (task) await updateTask(task.id, input);
      else await createTask(input);
      onClose();
    } catch {
      // Provider keeps the draft open and exposes the actionable storage error.
    }
  }

  return (
    <Modal title={task ? "编辑任务" : "新建任务"} onClose={onClose}>
      <form className="form-stack" onSubmit={submit}>
        <label className="field"><span>任务标题</span><input value={title} onChange={(event) => setTitle(event.target.value)} autoFocus /></label>
        <label className="field"><span>描述 <small>可选</small></span><textarea rows={3} value={description} onChange={(event) => setDescription(event.target.value)} /></label>
        <div className="form-grid">
          <label className="field"><span>日期</span><input type="date" value={taskDate} onChange={(event) => setTaskDate(event.target.value)} /></label>
          <label className="field"><span>优先级</span><select value={priority} onChange={(event) => setPriority(event.target.value as TaskPriority)}><option value="high">高</option><option value="medium">中</option><option value="low">低</option></select></label>
        </div>
        {task ? <label className="field"><span>状态</span><select value={status} onChange={(event) => setStatus(event.target.value as TaskStatus)}><option value="todo">未开始</option><option value="doing">进行中</option><option value="done">已完成</option><option value="cancelled">已取消</option></select></label> : null}
        {validation || error ? <p className="form-error" role="alert">{validation || error}</p> : null}
        <div className="form-actions"><button className="button secondary" type="button" onClick={onClose}>取消</button><button className="button primary" type="submit">保存任务</button></div>
      </form>
    </Modal>
  );
}

function TaskRow({ task, focusSessions = [] }: { task: WorkspaceTask; focusSessions?: FocusSession[] }) {
  const { updateTask, deleteTask, rollTaskToTomorrow } = useWorkspace();
  const [editing, setEditing] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const focusMinutes = focusMinutesForTask(focusSessions, task.id);

  return (
    <>
      <article className={`task-row task-${task.status}`}>
        <label className="task-check">
          <input
            type="checkbox"
            aria-label={task.title}
            checked={task.status === "done"}
            onChange={() => updateTask(task.id, { status: task.status === "done" ? "todo" : "done" })}
          />
          <span aria-hidden="true"><CheckCircle2 size={16} /></span>
        </label>
        <div className="task-copy">
          <div className="task-title-line"><h3>{task.title}</h3><span className={`badge priority-${task.priority}`}>{priorityLabels[task.priority]}</span><span className={`badge status-${task.status}`}>{statusLabels[task.status]}</span></div>
          {task.description ? <p>{task.description}</p> : null}
          {focusMinutes > 0 ? <span className="task-focus-time">{focusMinutes} 分钟专注</span> : null}
        </div>
        <div className="row-actions">
          {task.status !== "done" && task.status !== "cancelled" ? <button className="icon-button" type="button" onClick={() => rollTaskToTomorrow(task.id)} aria-label={`顺延 ${task.title}`}><CalendarPlus size={17} /></button> : null}
          <button className="icon-button" type="button" onClick={() => setEditing(true)} aria-label={`编辑 ${task.title}`}><Pencil size={17} /></button>
          <button className="icon-button" type="button" onClick={() => updateTask(task.id, { status: "cancelled" })} aria-label={`取消 ${task.title}`}><XCircle size={17} /></button>
          <button className="icon-button danger-text" type="button" onClick={() => setConfirming(true)} aria-label={`删除 ${task.title}`}><Trash2 size={17} /></button>
        </div>
      </article>
      {editing ? <TaskForm task={task} date={task.taskDate} onClose={() => setEditing(false)} /> : null}
      {confirming ? <ConfirmDialog title="确认删除任务" description={`“${task.title}”将从本地记录中永久删除。`} confirmLabel="确认删除" onCancel={() => setConfirming(false)} onConfirm={() => deleteTask(task.id)} /> : null}
    </>
  );
}

export function TaskList({ tasks, focusSessions = [] }: { tasks: WorkspaceTask[]; focusSessions?: FocusSession[] }) {
  if (!tasks.length) return <EmptyState icon={<CheckCircle2 size={22} />} title="这一天还没有任务" description="添加一件真正需要推进的事。" />;
  return <div className="task-list">{tasks.map((task) => <TaskRow key={task.id} task={task} focusSessions={focusSessions} />)}</div>;
}

export function TasksView() {
  const { workspace, saveStatus, syncMode } = useWorkspace();
  const currentDate = todayKey(workspace.profile.timezone);
  const [date, setDate] = useState(currentDate);
  const [status, setStatus] = useState<TaskStatus | "all">("all");
  const [creating, setCreating] = useState(false);
  const visibleTasks = tasksForDate(workspace.tasks, date).filter((task) => status === "all" || task.status === status);

  return (
    <section className="view-page">
      <PageHeader eyebrow="计划与推进" title="任务" description="只保留真正需要行动的事项。" action={<button className="button primary" type="button" onClick={() => setCreating(true)}><Plus size={17} />新建任务</button>} />
      <div className="toolbar">
        <label className="compact-field"><span>日期</span><input type="date" value={date} onChange={(event) => setDate(event.target.value)} /></label>
        <label className="compact-field"><span>状态</span><select value={status} onChange={(event) => setStatus(event.target.value as TaskStatus | "all")}><option value="all">全部</option><option value="todo">未开始</option><option value="doing">进行中</option><option value="done">已完成</option><option value="cancelled">已取消</option></select></label>
        <div className="toolbar-spacer" />
        <SaveIndicator status={saveStatus} mode={syncMode} />
      </div>
      <div className="section-heading"><div><h2>{date === currentDate ? "今天" : formatDate(date)}</h2><p>{visibleTasks.length} 项任务</p></div></div>
      <TaskList tasks={visibleTasks} focusSessions={workspace.focusSessions} />
      {creating ? <TaskForm date={date} onClose={() => setCreating(false)} /> : null}
    </section>
  );
}
