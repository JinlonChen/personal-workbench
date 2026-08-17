import { getSupabaseClient } from "@/data/supabase-client";
import type { AssistantContext } from "./context";
import { parseAssistantResponse, type AssistantResponse } from "./protocol";

interface FunctionError {
  message?: string;
  context?: { status?: number } | Response;
}

async function readableAssistantError(error: FunctionError): Promise<string> {
  const status = error.context?.status;
  if (status === 401) return "登录状态已失效，请重新登录后再试。";

  let code = error.message?.trim() ?? "";
  if (error.context instanceof Response) {
    try {
      const body = await error.context.clone().json() as { error?: { code?: string } | string; code?: string };
      code = typeof body.error === "string" ? body.error : body.error?.code ?? body.code ?? code;
    } catch {
      // The function gateway sometimes returns a non-JSON network error.
    }
  }
  if (code.includes("AI_NOT_CONFIGURED") || status === 503) {
    return "AI 助手尚未配置，请先在 Supabase 中设置 DeepSeek Key。";
  }
  if (/failed to send|fetch|network|timeout/i.test(code)) return "无法连接 AI 服务，请检查网络后重试。";
  return code && code !== "{}" ? `AI 请求失败：${code}` : "AI 服务暂时不可用，请稍后重试。";
}

export async function requestAssistant(prompt: string, context: AssistantContext): Promise<AssistantResponse> {
  const normalizedPrompt = prompt.trim();
  if (!normalizedPrompt) throw new Error("请输入要询问或新增的内容。");
  if (normalizedPrompt.length > 2000) throw new Error("输入内容不能超过 2000 字。");

  const { data, error } = await getSupabaseClient().functions.invoke("ai-assistant", {
    body: { prompt: normalizedPrompt, context },
  });
  if (error) throw new Error(await readableAssistantError(error));
  return parseAssistantResponse(data);
}
