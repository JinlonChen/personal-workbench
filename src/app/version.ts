export const APP_VERSION = "0.3.1";
export const APP_RELEASE_DATE = "2026-08-17";
export const APP_RELEASE_NOTES = [
  "修复 AI 一次新增多项时旧快照覆盖前一项的问题",
  "草稿待确认和保存期间锁定输入，关闭助手后清空本次对话",
  "进一步最小化发送给模型的任务、周期与记录上下文",
  "加强 Edge Function 对模型返回字段、日期和长度的校验",
] as const;
