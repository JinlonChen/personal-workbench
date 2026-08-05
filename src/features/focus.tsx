"use client";

import {
  AlertTriangle,
  ArrowUpRight,
  CalendarClock,
  CheckCircle2,
  ExternalLink,
  Pencil,
  Plus,
  Target,
  Trash2,
  UserRound,
} from "lucide-react";
import { type FormEvent, useMemo, useState } from "react";

import { ConfirmDialog, EmptyState, Modal, PageHeader, SaveIndicator } from "@/components/ui";
import { formatDate, todayKey } from "@/domain/date";
import type {
  FocusProject,
  FocusProjectInput,
  FocusProjectStatus,
  FocusProjectTier,
} from "@/domain/types";
import { useWorkspace } from "@/state/workspace-provider";

const statusLabels: Record<FocusProjectStatus, string> = {
  on_track: "正常",
  attention: "需关注",
  blocked: "已阻塞",
};

const tierLabels: Record<FocusProjectTier, string> = {
  top: "前三优先",
  parallel: "正常并行",
  paused: "明确暂缓",
};

const statusWeight: Record<FocusProjectStatus, number> = {
  blocked: 0,
  attention: 1,
  on_track: 2,
};

const tierWeight: Record<FocusProjectTier, number> = {
  top: 0,
  parallel: 1,
  paused: 2,
};

function validPlatformUrl(value: string) {
  if (!value) return true;
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function FocusProjectForm({ project, onClose }: { project?: FocusProject; onClose: () => void }) {
  const { createFocusProject, updateFocusProject, error, workspace } = useWorkspace();
  const [name, setName] = useState(project?.name ?? "");
  const [platformUrl, setPlatformUrl] = useState(project?.platformUrl ?? "");
  const [owner, setOwner] = useState(project?.owner ?? "");
  const [tier, setTier] = useState<FocusProjectTier>(project?.tier ?? "parallel");
  const [status, setStatus] = useState<FocusProjectStatus>(project?.status ?? "on_track");
  const [currentGoal, setCurrentGoal] = useState(project?.currentGoal ?? "");
  const [risk, setRisk] = useState(project?.risk ?? "");
  const [nextAction, setNextAction] = useState(project?.nextAction ?? "");
  const [latestConclusion, setLatestConclusion] = useState(project?.latestConclusion ?? "");
  const [nextReviewDate, setNextReviewDate] = useState(project?.nextReviewDate ?? todayKey(workspace.profile.timezone));
  const [validation, setValidation] = useState("");

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!name.trim()) {
      setValidation("请输入项目名称");
      return;
    }
    if (!owner.trim()) {
      setValidation("请输入负责人");
      return;
    }
    if (!validPlatformUrl(platformUrl.trim())) {
      setValidation("公司平台链接需要以 http:// 或 https:// 开头");
      return;
    }

    const input: FocusProjectInput = {
      name: name.trim(),
      platformUrl: platformUrl.trim(),
      owner: owner.trim(),
      tier,
      status,
      currentGoal: currentGoal.trim(),
      risk: risk.trim(),
      nextAction: nextAction.trim(),
      latestConclusion: latestConclusion.trim(),
      nextReviewDate,
    };

    try {
      if (project) await updateFocusProject(project.id, input);
      else await createFocusProject(input);
      onClose();
    } catch {
      // Provider exposes the storage or sync error while keeping the form open.
    }
  }

  return (
    <Modal title={project ? "编辑重点项目" : "新增重点项目"} onClose={onClose}>
      <form className="form-stack" onSubmit={submit}>
        <div className="form-grid">
          <label className="field"><span>项目名称</span><input value={name} onChange={(event) => setName(event.target.value)} autoFocus /></label>
          <label className="field"><span>负责人</span><input value={owner} onChange={(event) => setOwner(event.target.value)} /></label>
        </div>
        <label className="field"><span>公司平台链接 <small>可选，只保存入口</small></span><input type="url" value={platformUrl} onChange={(event) => setPlatformUrl(event.target.value)} placeholder="https://…" /></label>
        <div className="form-grid">
          <label className="field"><span>优先序列</span><select value={tier} onChange={(event) => setTier(event.target.value as FocusProjectTier)}><option value="top">前三优先</option><option value="parallel">正常并行</option><option value="paused">明确暂缓</option></select></label>
          <label className="field"><span>当前状态</span><select value={status} onChange={(event) => setStatus(event.target.value as FocusProjectStatus)}><option value="on_track">正常</option><option value="attention">需关注</option><option value="blocked">已阻塞</option></select></label>
        </div>
        <label className="field"><span>本周目标或当前节点</span><textarea rows={2} value={currentGoal} onChange={(event) => setCurrentGoal(event.target.value)} /></label>
        <label className="field"><span>最大风险或阻碍</span><textarea rows={2} value={risk} onChange={(event) => setRisk(event.target.value)} /></label>
        <label className="field"><span>我的下一步</span><textarea rows={2} value={nextAction} onChange={(event) => setNextAction(event.target.value)} placeholder="例如：协调资源、作出决策或向上汇报" /></label>
        <label className="field"><span>最新结论</span><textarea rows={2} value={latestConclusion} onChange={(event) => setLatestConclusion(event.target.value)} /></label>
        <label className="field"><span>下次检查日期</span><input type="date" value={nextReviewDate} onChange={(event) => setNextReviewDate(event.target.value)} /></label>
        {validation || error ? <p className="form-error" role="alert">{validation || error}</p> : null}
        <div className="form-actions"><button className="button secondary" type="button" onClick={onClose}>取消</button><button className="button primary" type="submit">保存项目</button></div>
      </form>
    </Modal>
  );
}

function FocusProjectCard({ project }: { project: FocusProject }) {
  const { createTask, deleteFocusProject, workspace } = useWorkspace();
  const [editing, setEditing] = useState(false);
  const [confirming, setConfirming] = useState(false);

  async function addActionToToday() {
    if (!project.nextAction) return;
    await createTask({
      title: project.nextAction,
      description: `关联重点项目：${project.name}`,
      taskDate: todayKey(workspace.profile.timezone),
      priority: project.tier === "top" ? "high" : "medium",
      status: "todo",
    });
  }

  return (
    <>
      <article className={`focus-project-card focus-status-${project.status}`}>
        <header>
          <div className="focus-project-title">
            <span className={`focus-status-dot ${project.status}`} aria-hidden="true" />
            <div><h3>{project.name}</h3><span>{tierLabels[project.tier]} · {statusLabels[project.status]}</span></div>
          </div>
          <div className="row-actions focus-row-actions">
            <button className="icon-button" type="button" onClick={() => setEditing(true)} aria-label={`编辑 ${project.name}`}><Pencil size={17} /></button>
            <button className="icon-button danger-text" type="button" onClick={() => setConfirming(true)} aria-label={`删除 ${project.name}`}><Trash2 size={17} /></button>
          </div>
        </header>
        <div className="focus-project-owner"><UserRound size={14} /><span>{project.owner}</span><CalendarClock size={14} /><span>{formatDate(project.nextReviewDate)}检查</span></div>
        <div className="focus-project-details">
          <div><span>本周目标 / 当前节点</span><strong>{project.currentGoal || "尚未填写"}</strong></div>
          <div><span>最大风险 / 阻碍</span><strong>{project.risk || "当前无明确风险"}</strong></div>
          <div><span>我的下一步</span><strong>{project.nextAction || "当前不需要介入"}</strong></div>
          <div><span>最新结论</span><strong>{project.latestConclusion || "尚未填写"}</strong></div>
        </div>
        <footer>
          {project.platformUrl ? <a className="text-button" href={project.platformUrl} target="_blank" rel="noreferrer">公司平台<ExternalLink size={15} /></a> : <span className="focus-no-link">未填写公司平台链接</span>}
          {project.nextAction ? <button className="button secondary compact-button" type="button" onClick={() => void addActionToToday()} aria-label={`将 ${project.nextAction} 加入今日任务`}><Plus size={15} />加入今日任务</button> : null}
        </footer>
      </article>
      {editing ? <FocusProjectForm project={project} onClose={() => setEditing(false)} /> : null}
      {confirming ? <ConfirmDialog title="确认删除重点项目" description={`“${project.name}”的管理摘要将被永久删除，公司平台中的正式项目不会受到影响。`} confirmLabel="确认删除" onCancel={() => setConfirming(false)} onConfirm={() => deleteFocusProject(project.id)} /> : null}
    </>
  );
}

export function FocusView() {
  const { workspace, saveStatus, syncMode } = useWorkspace();
  const [creating, setCreating] = useState(false);
  const date = todayKey(workspace.profile.timezone);
  const projects = useMemo(
    () => [...workspace.focusProjects].sort((left, right) => tierWeight[left.tier] - tierWeight[right.tier] || statusWeight[left.status] - statusWeight[right.status] || left.nextReviewDate.localeCompare(right.nextReviewDate)),
    [workspace.focusProjects],
  );
  const openTasks = workspace.tasks.filter((task) => task.taskDate === date && task.status !== "done" && task.status !== "cancelled");
  const attentionCount = projects.filter((project) => project.status !== "on_track").length;
  const decisionCount = projects.filter((project) => project.status === "blocked").length;
  const checkedCount = projects.filter((project) => project.latestConclusion && project.nextReviewDate >= date).length;
  const owners = useMemo(() => {
    const grouped = new Map<string, FocusProject[]>();
    for (const project of projects) grouped.set(project.owner, [...(grouped.get(project.owner) ?? []), project]);
    return [...grouped.entries()].map(([owner, items]) => ({
      owner,
      projects: items,
      status: [...items].sort((left, right) => statusWeight[left.status] - statusWeight[right.status])[0].status,
      nextReviewDate: [...items].sort((left, right) => left.nextReviewDate.localeCompare(right.nextReviewDate))[0].nextReviewDate,
    }));
  }, [projects]);

  return (
    <section className="view-page focus-page">
      <PageHeader eyebrow="个人管理驾驶舱" title="重点关注" description="公司平台保存完整过程；这里仅保留需要你判断、协调和推动的管理摘要。" action={<button className="button primary" type="button" onClick={() => setCreating(true)}><Plus size={17} />新增关注项目</button>} />

      <div className="focus-summary-grid">
        <div><span>重点项目</span><strong>{projects.length}</strong></div>
        <div><span>需要关注</span><strong className="summary-warning">{attentionCount}</strong></div>
        <div><span>等待我决策</span><strong className="summary-danger">{decisionCount}</strong></div>
        <div><span>已有检查结论</span><strong className="summary-good">{checkedCount} / {projects.length}</strong></div>
      </div>

      <div className="focus-dashboard-grid">
        <section className="focus-panel">
          <header className="focus-panel-header"><div><h2>重点项目</h2><p>完整任务和资料仍在公司平台维护。</p></div><SaveIndicator status={saveStatus} mode={syncMode} /></header>
          {projects.length ? <div className="focus-project-list">{projects.map((project) => <FocusProjectCard key={project.id} project={project} />)}</div> : <EmptyState icon={<Target size={22} />} title="还没有重点关注项目" description="只添加真正需要你定期判断、协调或推动的项目。" />}
        </section>

        <aside className="focus-side-stack">
          <section className="focus-panel">
            <header className="focus-panel-header"><div><h2>我的管理动作</h2><p>直接复用今天的任务，不建立第二套清单。</p></div></header>
            {openTasks.length ? <div className="focus-action-list">{openTasks.slice(0, 5).map((task) => <div className="focus-action-item" key={task.id}><CheckCircle2 size={17} /><div><strong>{task.title}</strong><span>{task.description || "今日任务"}</span></div></div>)}</div> : <div className="focus-side-empty"><CheckCircle2 size={20} /><span>今天暂无未完成任务</span></div>}
          </section>

          <section className="focus-panel">
            <header className="focus-panel-header"><div><h2>负责人检查</h2><p>管理负责人，不复制每位员工的任务。</p></div></header>
            {owners.length ? <div className="focus-owner-list">{owners.map((item) => <div className="focus-owner-item" key={item.owner}><span className="focus-owner-avatar">{item.owner.slice(0, 1)}</span><div><strong>{item.owner}</strong><span>{item.projects.length} 个关注项目 · {statusLabels[item.status]}</span></div><time dateTime={item.nextReviewDate}>{formatDate(item.nextReviewDate)}</time></div>)}</div> : <div className="focus-side-empty"><UserRound size={20} /><span>添加项目后自动汇总负责人</span></div>}
          </section>

          <div className="focus-principle"><AlertTriangle size={18} /><p><strong>使用原则</strong>这里只写结论、风险和你的下一步；技术参数、客户信息与员工敏感评价仍留在公司系统。</p></div>
        </aside>
      </div>

      <div className="focus-footer-link"><ArrowUpRight size={16} /><span>新增任务进入原有“任务”页面，记录、复盘和设置逻辑保持不变。</span></div>
      {creating ? <FocusProjectForm onClose={() => setCreating(false)} /> : null}
    </section>
  );
}
