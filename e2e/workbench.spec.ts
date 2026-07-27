import { expect, test } from "@playwright/test";

const navigation = [
  ["任务", "任务"],
  ["记录", "记录"],
  ["复盘", "每日复盘"],
  ["设置", "设置"],
] as const;

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "今日工作台", exact: true })).toBeVisible();
});

test("首页在目标视口内显示工作台且不产生横向溢出", async ({ page }) => {
  await expect(page.getByRole("heading", { name: "今日工作台", exact: true })).toBeVisible();
  const fitsViewport = await page.evaluate(
    () => document.documentElement.scrollWidth <= window.innerWidth,
  );
  expect(fitsViewport).toBeTruthy();
});

test("主要导航可以打开任务、记录、复盘和设置", async ({ page }) => {
  const primaryNavigation = page.getByRole("navigation", { name: "主要导航" });

  for (const [label, heading] of navigation) {
    await primaryNavigation.getByRole("button", { name: label, exact: true }).click();
    await expect(page.getByRole("heading", { name: heading, exact: true })).toBeVisible();
  }
});

test("可以新建任务并将其标记为已完成", async ({ page }) => {
  const primaryNavigation = page.getByRole("navigation", { name: "主要导航" });
  await primaryNavigation.getByRole("button", { name: "任务", exact: true }).click();
  await expect(page.getByRole("heading", { name: "任务", exact: true })).toBeVisible();

  const title = `端到端任务 ${Date.now()}`;
  await page.getByRole("button", { name: "新建任务", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "新建任务" });
  await expect(dialog).toBeVisible();
  await dialog.getByLabel("任务标题").fill(title);
  await dialog.getByRole("button", { name: "保存任务", exact: true }).click();

  const checkbox = page.getByRole("checkbox", { name: title, exact: true });
  await expect(checkbox).toBeVisible();
  await checkbox.check();
  await expect(checkbox).toBeChecked();
});
