export const APP_VERSION = "0.3.2";
export const APP_RELEASE_DATE = "2026-08-17";
export const APP_RELEASE_NOTES = [
  "修复 DeepSeek 返回单个任务草稿时出现 AI_INVALID_RESPONSE 的问题",
  "兼容单操作草稿后仍执行原有字段、日期和操作类型校验",
  "AI 响应校验日志只记录字段路径，不记录任务正文",
] as const;
