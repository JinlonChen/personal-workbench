import type { Workspace } from "./types";

export function exportJson(workspace: Workspace): string {
  return JSON.stringify(workspace, null, 2);
}

export function exportMarkdown(workspace: Workspace): string {
  const lines = [
    "# 一页 · 个人工作台导出",
    "",
    `用户：${workspace.profile.displayName}`,
    `时区：${workspace.profile.timezone}`,
    "",
    "## 任务",
    ...workspace.tasks.map((task) => `- [${task.status === "done" ? "x" : " "}] ${task.taskDate} · ${task.title}`),
    "",
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
