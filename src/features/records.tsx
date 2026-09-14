"use client";

import { BookOpen, BriefcaseBusiness, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { type FormEvent, useMemo, useState } from "react";

import { ConfirmDialog, EmptyState, Modal, PageHeader, SaveIndicator } from "@/components/ui";
import { todayKey } from "@/domain/date";
import { filterLearningEntries, filterWorkEntries } from "@/domain/selectors";
import type { LearningEntry, LearningEntryInput, ThoughtEntry, ThoughtEntryInput, WorkEntry, WorkEntryInput } from "@/domain/types";
import { useWorkspace } from "@/state/workspace-provider";

type RecordKind = "work" | "learning" | "thought";
type RecordEntry = WorkEntry | LearningEntry | ThoughtEntry;

export function recentMonthKeys(anchorDate: string, count = 3): string[] {
  const date = new Date(`${anchorDate.slice(0, 7)}-01T12:00:00.000Z`);
  if (Number.isNaN(date.getTime())) return [];
  return Array.from({ length: count }, (_, index) => {
    const current = new Date(date);
    current.setUTCMonth(current.getUTCMonth() - index);
    return current.toISOString().slice(0, 7);
  });
}

export function groupRecordsByMonth<T extends { entryDate: string }>(entries: T[], monthKeys: string[]) {
  return monthKeys.map((key) => ({
    key,
    entries: entries
      .filter((entry) => entry.entryDate.slice(0, 7) === key)
      .sort((left, right) => right.entryDate.localeCompare(left.entryDate)),
  }));
}

function monthLabel(key: string) {
  return new Intl.DateTimeFormat("zh-CN", { year: "numeric", month: "long", timeZone: "UTC" }).format(new Date(`${key}-01T12:00:00.000Z`));
}

function splitTags(value: string) {
  return [...new Set(value.split(/[,，]/).map((tag) => tag.trim()).filter(Boolean))];
}

function WorkEntryForm({ entry, date, onClose }: { entry?: WorkEntry; date: string; onClose: () => void }) {
  const { workspace, createWorkEntry, updateWorkEntry, error } = useWorkspace();
  const [title, setTitle] = useState(entry?.title ?? "");
  const [content, setContent] = useState(entry?.content ?? "");
  const [result, setResult] = useState(entry?.result ?? "");
  const [entryDate, setEntryDate] = useState(entry?.entryDate ?? date);
  const [taskId, setTaskId] = useState(entry?.taskId ?? "");
  const [tags, setTags] = useState(entry?.tags.join("，") ?? "");
  const [validation, setValidation] = useState("");

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!title.trim() || !content.trim()) {
      setValidation("请填写工作标题和内容");
      return;
    }
    const input: WorkEntryInput = { title: title.trim(), content: content.trim(), result: result.trim(), entryDate, taskId: taskId || null, tags: splitTags(tags) };
    try {
      if (entry) await updateWorkEntry(entry.id, input);
      else await createWorkEntry(input);
      onClose();
    } catch {
      // Keep the draft visible when persistence fails.
    }
  }

  return (
    <Modal title={entry ? "编辑工作记录" : "新建工作记录"} onClose={onClose}>
      <form className="form-stack" onSubmit={submit}>
        <label className="field"><span>工作标题</span><input value={title} onChange={(event) => setTitle(event.target.value)} autoFocus /></label>
        <label className="field"><span>工作内容</span><textarea rows={4} value={content} onChange={(event) => setContent(event.target.value)} /></label>
        <label className="field"><span>产出或结果 <small>可选</small></span><textarea rows={2} value={result} onChange={(event) => setResult(event.target.value)} /></label>
        <div className="form-grid">
          <label className="field"><span>日期</span><input type="date" value={entryDate} onChange={(event) => setEntryDate(event.target.value)} /></label>
          <label className="field"><span>关联任务 <small>可选</small></span><select value={taskId} onChange={(event) => setTaskId(event.target.value)}><option value="">不关联</option>{workspace.tasks.map((task) => <option key={task.id} value={task.id}>{task.title}</option>)}</select></label>
        </div>
        <label className="field"><span>标签 <small>使用逗号分隔</small></span><input value={tags} onChange={(event) => setTags(event.target.value)} placeholder="项目，客户" /></label>
        {validation || error ? <p className="form-error" role="alert">{validation || error}</p> : null}
        <div className="form-actions"><button className="button secondary" type="button" onClick={onClose}>取消</button><button className="button primary" type="submit">保存工作记录</button></div>
      </form>
    </Modal>
  );
}

function LearningEntryForm({ entry, date, onClose }: { entry?: LearningEntry; date: string; onClose: () => void }) {
  const { createLearningEntry, updateLearningEntry, error } = useWorkspace();
  const [title, setTitle] = useState(entry?.title ?? "");
  const [content, setContent] = useState(entry?.content ?? "");
  const [sourceUrl, setSourceUrl] = useState(entry?.sourceUrl ?? "");
  const [keyPoints, setKeyPoints] = useState(entry?.keyPoints ?? "");
  const [nextAction, setNextAction] = useState(entry?.nextAction ?? "");
  const [entryDate, setEntryDate] = useState(entry?.entryDate ?? date);
  const [tags, setTags] = useState(entry?.tags.join("，") ?? "");
  const [validation, setValidation] = useState("");

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!title.trim() || !content.trim()) {
      setValidation("请填写学习标题和内容");
      return;
    }
    if (sourceUrl && !URL.canParse(sourceUrl)) {
      setValidation("来源链接格式不正确");
      return;
    }
    const input: LearningEntryInput = { title: title.trim(), content: content.trim(), sourceUrl: sourceUrl.trim(), keyPoints: keyPoints.trim(), nextAction: nextAction.trim(), entryDate, tags: splitTags(tags) };
    try {
      if (entry) await updateLearningEntry(entry.id, input);
      else await createLearningEntry(input);
      onClose();
    } catch {
      // Keep the draft visible when persistence fails.
    }
  }

  return (
    <Modal title={entry ? "编辑学习记录" : "新建学习记录"} onClose={onClose}>
      <form className="form-stack" onSubmit={submit}>
        <label className="field"><span>学习标题</span><input value={title} onChange={(event) => setTitle(event.target.value)} autoFocus /></label>
        <label className="field"><span>学习内容</span><textarea rows={4} value={content} onChange={(event) => setContent(event.target.value)} /></label>
        <label className="field"><span>关键要点 <small>可选</small></span><textarea rows={3} value={keyPoints} onChange={(event) => setKeyPoints(event.target.value)} /></label>
        <label className="field"><span>下一步行动 <small>可选</small></span><input value={nextAction} onChange={(event) => setNextAction(event.target.value)} /></label>
        <div className="form-grid">
          <label className="field"><span>日期</span><input type="date" value={entryDate} onChange={(event) => setEntryDate(event.target.value)} /></label>
          <label className="field"><span>来源链接 <small>可选</small></span><input type="url" value={sourceUrl} onChange={(event) => setSourceUrl(event.target.value)} placeholder="https://" /></label>
        </div>
        <label className="field"><span>标签 <small>使用逗号分隔</small></span><input value={tags} onChange={(event) => setTags(event.target.value)} placeholder="技术，阅读" /></label>
        {validation || error ? <p className="form-error" role="alert">{validation || error}</p> : null}
        <div className="form-actions"><button className="button secondary" type="button" onClick={onClose}>取消</button><button className="button primary" type="submit">保存学习记录</button></div>
      </form>
    </Modal>
  );
}

function ThoughtEntryForm({ entry, date, onClose }: { entry?: ThoughtEntry; date: string; onClose: () => void }) {
  const { createThoughtEntry, updateThoughtEntry, error } = useWorkspace();
  const [title, setTitle] = useState(entry?.title ?? "");
  const [content, setContent] = useState(entry?.content ?? "");
  const [entryDate, setEntryDate] = useState(entry?.entryDate ?? date);
  const [tags, setTags] = useState(entry?.tags.join("，") ?? "");
  const [validation, setValidation] = useState("");

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!title.trim() || !content.trim()) {
      setValidation("请填写思考标题和内容");
      return;
    }
    const input: ThoughtEntryInput = { title: title.trim(), content: content.trim(), entryDate, tags: splitTags(tags) };
    try {
      if (entry) await updateThoughtEntry(entry.id, input);
      else await createThoughtEntry(input);
      onClose();
    } catch {
      // Keep the draft visible when persistence fails.
    }
  }

  return (
    <Modal title={entry ? "编辑思考与灵感" : "新建思考与灵感"} onClose={onClose}>
      <form className="form-stack" onSubmit={submit}>
        <label className="field"><span>思考标题</span><input value={title} onChange={(event) => setTitle(event.target.value)} autoFocus /></label>
        <label className="field"><span>思考内容</span><textarea rows={5} value={content} onChange={(event) => setContent(event.target.value)} /></label>
        <div className="form-grid">
          <label className="field"><span>日期</span><input type="date" value={entryDate} onChange={(event) => setEntryDate(event.target.value)} /></label>
          <label className="field"><span>标签 <small>使用逗号分隔</small></span><input value={tags} onChange={(event) => setTags(event.target.value)} placeholder="灵感，产品" /></label>
        </div>
        {validation || error ? <p className="form-error" role="alert">{validation || error}</p> : null}
        <div className="form-actions"><button className="button secondary" type="button" onClick={onClose}>取消</button><button className="button primary" type="submit">保存思考与灵感</button></div>
      </form>
    </Modal>
  );
}

function RecordRow({ kind, entry }: { kind: RecordKind; entry: RecordEntry }) {
  const { deleteWorkEntry, deleteLearningEntry, deleteThoughtEntry } = useWorkspace();
  const [editing, setEditing] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const work = kind === "work" ? entry as WorkEntry : null;
  const learning = kind === "learning" ? entry as LearningEntry : null;
  const thought = kind === "thought" ? entry as ThoughtEntry : null;

  return (
    <>
      <article className="record-row">
        <div className="record-row-main"><strong>{entry.title}</strong><time>{entry.entryDate}</time></div>
        <div className="row-actions record-actions"><button className="icon-button" type="button" onClick={() => setEditing(true)} aria-label={`编辑 ${entry.title}`}><Pencil size={16} /></button><button className="icon-button danger-text" type="button" onClick={() => setConfirming(true)} aria-label={`删除 ${entry.title}`}><Trash2 size={16} /></button></div>
      </article>
      {editing && work ? <WorkEntryForm entry={work} date={work.entryDate} onClose={() => setEditing(false)} /> : null}
      {editing && learning ? <LearningEntryForm entry={learning} date={learning.entryDate} onClose={() => setEditing(false)} /> : null}
      {editing && thought ? <ThoughtEntryForm entry={thought} date={thought.entryDate} onClose={() => setEditing(false)} /> : null}
      {confirming ? <ConfirmDialog title="确认删除记录" description={`“${entry.title}”将从本地记录中永久删除。`} confirmLabel="确认删除" onCancel={() => setConfirming(false)} onConfirm={() => kind === "work" ? deleteWorkEntry(entry.id) : kind === "learning" ? deleteLearningEntry(entry.id) : deleteThoughtEntry(entry.id)} /> : null}
    </>
  );
}

export function RecordsView() {
  const { workspace, saveStatus, syncMode } = useWorkspace();
  const date = todayKey(workspace.profile.timezone);
  const [kind, setKind] = useState<RecordKind>("work");
  const [creating, setCreating] = useState(false);
  const [keyword, setKeyword] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [selectedMonth, setSelectedMonth] = useState("");
  const [tag, setTag] = useState("");
  const allTags = useMemo(() => [...new Set([...workspace.workEntries, ...workspace.learningEntries, ...workspace.thoughtEntries].flatMap((entry) => entry.tags))].sort(), [workspace]);
  const entries = kind === "work"
    ? filterWorkEntries(workspace.workEntries, { keyword, date: dateFilter, tag })
    : kind === "learning"
      ? filterLearningEntries(workspace.learningEntries, { keyword, date: dateFilter, tag })
      : workspace.thoughtEntries.filter((entry) => {
        const text = `${entry.title} ${entry.content} ${entry.tags.join(" ")}`.toLocaleLowerCase();
        const query = keyword.trim().toLocaleLowerCase();
        return (!dateFilter || entry.entryDate === dateFilter) && (!tag || entry.tags.includes(tag)) && (!query || text.includes(query));
      });
  const monthAnchor = dateFilter || (selectedMonth ? `${selectedMonth}-01` : date);
  const monthGroups = groupRecordsByMonth(entries, recentMonthKeys(monthAnchor));
  const hasEntries = monthGroups.some((group) => group.entries.length > 0);
  const kindLabel = kind === "work" ? "工作" : kind === "learning" ? "学习" : "思考与灵感";

  return (
    <section className="view-page">
      <PageHeader eyebrow="工作、学习与思考" title="记录" description="把做过的事、新获得的认识和灵感留下来。" action={<button className="button primary" type="button" onClick={() => setCreating(true)}><Plus size={17} />新建记录</button>} />
      <div className="record-controls">
        <div className="segmented" aria-label="记录类型"><button type="button" className={kind === "work" ? "active" : ""} aria-pressed={kind === "work"} onClick={() => { setKind("work"); setKeyword(""); }}>工作记录</button><button type="button" className={kind === "learning" ? "active" : ""} aria-pressed={kind === "learning"} onClick={() => { setKind("learning"); setKeyword(""); }}>学习记录</button><button type="button" className={kind === "thought" ? "active" : ""} aria-pressed={kind === "thought"} onClick={() => { setKind("thought"); setKeyword(""); }}>思考与灵感</button></div>
        <SaveIndicator status={saveStatus} mode={syncMode} />
      </div>
      <div className="filter-row">
        <label className="search-field"><Search size={16} aria-hidden="true" /><span className="sr-only">搜索记录</span><input aria-label="搜索记录" value={keyword} onChange={(event) => setKeyword(event.target.value)} placeholder="搜索标题、内容或标签" /></label>
        <label className="compact-field"><span className="sr-only">筛选日期</span><input aria-label="筛选日期" type="date" value={dateFilter} onChange={(event) => setDateFilter(event.target.value)} /></label>
        <label className="compact-field"><span className="sr-only">筛选标签</span><select aria-label="筛选标签" value={tag} onChange={(event) => setTag(event.target.value)}><option value="">全部标签</option>{allTags.map((item) => <option key={item}>{item}</option>)}</select></label>
        <label className="compact-field"><span className="sr-only">月份范围</span><input aria-label="月份范围" type="month" value={selectedMonth} onChange={(event) => setSelectedMonth(event.target.value)} /></label>
        {selectedMonth ? <button className="button secondary record-month-reset" type="button" onClick={() => setSelectedMonth("")}>近三个月</button> : null}
      </div>
      {hasEntries ? <div className="record-month-grid">{monthGroups.map((group) => <section className="record-month-column" key={group.key} aria-labelledby={`record-month-${group.key}`}><h2 id={`record-month-${group.key}`}>{monthLabel(group.key)}</h2><div className="record-list" role="list">{group.entries.map((entry) => <RecordRow key={entry.id} kind={kind} entry={entry} />)}</div></section>)}</div> : <EmptyState icon={kind === "work" ? <BriefcaseBusiness size={22} /> : kind === "learning" ? <BookOpen size={22} /> : <span aria-hidden="true">✦</span>} title={keyword || dateFilter || tag ? "没有匹配的记录" : `还没有${kindLabel}记录`} description={keyword || dateFilter || tag ? "调整筛选条件再试一次。" : "及时写下，晚上复盘会更轻松。"} />}
      {creating && kind === "work" ? <WorkEntryForm date={date} onClose={() => setCreating(false)} /> : null}
      {creating && kind === "learning" ? <LearningEntryForm date={date} onClose={() => setCreating(false)} /> : null}
      {creating && kind === "thought" ? <ThoughtEntryForm date={date} onClose={() => setCreating(false)} /> : null}
    </section>
  );
}
