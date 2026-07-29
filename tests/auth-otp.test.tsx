import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { SignInView } from "@/features/auth";
import { AuthProvider } from "@/state/auth-provider";

const authMocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  onAuthStateChange: vi.fn(),
  signInWithOtp: vi.fn(),
  verifyOtp: vi.fn(),
}));

vi.mock("@/data/supabase-client", () => ({
  isSupabaseConfigured: () => true,
  getSupabaseClient: () => ({ auth: authMocks }),
}));

describe("email code sign in", () => {
  beforeEach(() => {
    authMocks.getSession.mockReset().mockResolvedValue({ data: { session: null }, error: null });
    authMocks.onAuthStateChange.mockReset().mockReturnValue({
      data: { subscription: { unsubscribe: vi.fn() } },
    });
    authMocks.signInWithOtp.mockReset().mockResolvedValue({ data: {}, error: null });
    authMocks.verifyOtp.mockReset().mockResolvedValue({ data: {}, error: null });
  });

  it("sends and verifies an email code without a redirect", async () => {
    const user = userEvent.setup();
    render(
      <AuthProvider>
        <SignInView />
      </AuthProvider>,
    );

    await waitFor(() => expect(authMocks.getSession).toHaveBeenCalled());
    await user.type(screen.getByLabelText("邮箱地址"), " 281033295@qq.com ");
    await user.click(screen.getByRole("button", { name: "发送验证码" }));

    expect(authMocks.signInWithOtp).toHaveBeenCalledWith({
      email: "281033295@qq.com",
    });
    expect(screen.getByText("281033295@qq.com")).toBeInTheDocument();

    await user.type(screen.getByLabelText("邮箱验证码"), "123456");
    await user.click(screen.getByRole("button", { name: "验证并登录" }));

    expect(authMocks.verifyOtp).toHaveBeenCalledWith({
      email: "281033295@qq.com",
      token: "123456",
      type: "email",
    });
  });

  it("shows a readable message when the email service returns an empty server error", async () => {
    authMocks.signInWithOtp.mockResolvedValueOnce({
      data: {},
      error: { message: "{}", status: 500 },
    });
    const user = userEvent.setup();
    render(
      <AuthProvider>
        <SignInView />
      </AuthProvider>,
    );

    await waitFor(() => expect(authMocks.getSession).toHaveBeenCalled());
    await user.type(screen.getByLabelText("邮箱地址"), "281033295@qq.com");
    await user.click(screen.getByRole("button", { name: "发送验证码" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "验证码发送失败：邮件服务暂时不可用，请稍后重试。",
    );
  });
});
