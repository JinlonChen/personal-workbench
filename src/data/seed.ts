import { todayKey } from "@/domain/date";
import { createId } from "@/domain/id";
import type { Workspace } from "@/domain/types";

export function createSeedWorkspace(date = todayKey()): Workspace {
  const now = new Date().toISOString();
  return {
    schemaVersion: 1,
    profile: {
      id: "local-user",
      displayName: "朋友",
      timezone: "Asia/Shanghai",
      createdAt: now,
      updatedAt: now,
    },
    tasks: [
      {
        id: createId(),
        title: "完成今天最重要的一件事",
        description: "把注意力留给真正推动事情前进的工作。",
        taskDate: date,
        priority: "high",
        status: "doing",
        source: "manual",
        createdAt: now,
        updatedAt: now,
      },
      {
        id: createId(),
        title: "整理一条工作记录",
        description: "写下完成了什么，以及产生的结果。",
        taskDate: date,
        priority: "medium",
        status: "todo",
        source: "manual",
        createdAt: now,
        updatedAt: now,
      },
      {
        id: createId(),
        title: "晚上用两分钟复盘",
        description: "留下收获、阻碍与明天的重点。",
        taskDate: date,
        priority: "low",
        status: "todo",
        source: "manual",
        createdAt: now,
        updatedAt: now,
      },
    ],
    workEntries: [],
    learningEntries: [],
    dailyReviews: [],
  };
}
