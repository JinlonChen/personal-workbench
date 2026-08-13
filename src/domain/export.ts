import type { Workspace } from "./types";

const focusStatusLabels = {
  on_track: "正常",
  attention: "需关注",
  blocked: "已阻塞",
} as const;

export function exportJson(workspace: Workspace): string {
  return JSON.stringify(workspace, null, 2);
}

export function exportMarkdown(workspace: Workspace): string {
  const focusByDate = new Map<string, typeof workspace.focusSessions>();
  for (const session of workspace.focusSessions) {
    const matches = focusByDate.get(session.focusDate) ?? [];
    matches.push(session);
    focusByDate.set(session.focusDate, matches);
  }
  const focusLines = [...focusByDate.entries()]
    .sort(([left], [right]) => right.localeCompare(left))
    .flatMap(([date, sessions]) => [
      `### ${date} · ${sessions.reduce((sum, session) => sum + session.plannedMinutes, 0)} 分钟`,
      ...sessions.map((session) => `- ${session.taskTitle} · ${session.plannedMinutes} 分钟`),
      "",
    ]);
  const lines = [
    "# 一页 · 个人工作台导出",
    "",
    `用户：${workspace.profile.displayName}`,
    `时区：${workspace.profile.timezone}`,
    "",
    "## 重点关注",
    ...workspace.focusProjects.flatMap((project) => [
      `### ${project.name}`,
      `负责人：${project.owner}`,
      `状态：${focusStatusLabels[project.status]}`,
      project.currentGoal ? `当前目标：${project.currentGoal}` : "",
      project.risk ? `风险：${project.risk}` : "",
      project.nextAction ? `我的下一步：${project.nextAction}` : "",
      "",
    ]),
    "## 任务",
    ...workspace.tasks.map((task) => `- [${task.status === "done" ? "x" : " "}] ${task.taskDate} · ${task.title}`),
    "",
    "## 专注记录",
    ...focusLines,
    "## 工作记录",
    ...workspace.workEntries.flatMap((entry) => [
      `### ${entry.entryDate} · ${entry.title}`,
      entry.content,
      entry.result ? `结果：${entry.result}` : "",
      entry.tags.length ? `标签：${entry.tags.join("、")}` : "",
      "",
    ]),
    "## 学习记录",
    ...workspace.learningEntries.flatMap((entry) => [
      `### ${entry.entryDate} · ${entry.title}`,
      entry.content,
      entry.keyPoints ? `关键要点：${entry.keyPoints}` : "",
      entry.nextAction ? `下一步：${entry.nextAction}` : "",
      "",
    ]),
    "## 每日复盘",
    ...workspace.dailyReviews.flatMap((review) => [
      `### ${review.reviewDate}`,
      `完成：${review.completedSummary}`,
      `收获：${review.mainGain}`,
      `明日重点：${review.tomorrowFocus}`,
      "",
    ]),
  ];
  return lines.filter((line, index) => line !== "" || lines[index - 1] !== "").join("\n").trimEnd();
}
