import { expect, test } from "@playwright/test";

const navigation = [
  ["关注", "重点关注"],
  ["任务", "任务"],
  ["周期", "周期任务"],
  ["记录", "记录"],
  ["复盘", "每日复盘"],
  ["设置", "设置"],
] as const;

test.beforeEach(async ({ page }) => {
  await page.goto("/?local=1");
  await expect(page.getByRole("heading", { name: "今日工作台", exact: true })).toBeVisible();
});

test("首页在目标视口内显示工作台且不产生横向溢出", async ({ page }) => {
  await expect(page.getByRole("heading", { name: "今日工作台", exact: true })).toBeVisible();
  const fitsViewport = await page.evaluate(
    () => document.documentElement.scrollWidth <= window.innerWidth,
  );
  expect(fitsViewport).toBeTruthy();
});

test("手机视口可以使用番茄钟且不产生横向溢出", async ({ page }) => {
  await expect(page.getByRole("heading", { name: "专注计时", exact: true })).toBeVisible();
  const fitsViewport = await page.evaluate(
    () => document.documentElement.scrollWidth <= window.innerWidth,
  );
  expect(fitsViewport).toBeTruthy();

  await page.getByRole("button", { name: "开始专注", exact: true }).click();
  await expect(page.getByRole("button", { name: "暂停", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "放弃", exact: true }).click();
  await expect(page.getByRole("button", { name: "开始专注", exact: true })).toBeVisible();
  await expect(page.getByText("今日完成 0 个番茄 · 0 分钟", { exact: true })).toBeVisible();
});

test("主要导航可以打开关注、任务、周期、记录、复盘和设置", async ({ page }) => {
  const primaryNavigation = page.getByRole("navigation", { name: "主要导航" });

  for (const [label, heading] of navigation) {
    await primaryNavigation.getByRole("button", { name: label, exact: true }).click();
    await expect(page.getByRole("heading", { name: heading, exact: true })).toBeVisible();
  }
});

test("周期任务到期后自动进入今日任务", async ({ page }) => {
  const primaryNavigation = page.getByRole("navigation", { name: "主要导航" });
  await primaryNavigation.getByRole("button", { name: "周期", exact: true }).click();
  await page.getByRole("button", { name: "新建周期", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "新建周期任务" });
  await dialog.getByLabel("周期任务名称", { exact: true }).fill("端到端周期任务");
  await dialog.getByRole("button", { name: "保存周期任务", exact: true }).click();

  await expect(page.getByText("端到端周期任务", { exact: true })).toBeVisible();
  await primaryNavigation.getByRole("button", { name: "今日", exact: true }).click();
  await expect(page.getByText("今天有 1 项周期任务", { exact: true })).toBeVisible();
  await expect(page.getByText("周期任务", { exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBeTruthy();
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

test("可以创建待办任务并保持手机视口无横向溢出", async ({ page }) => {
  const primaryNavigation = page.getByRole("navigation", { name: "主要导航" });
  await primaryNavigation.getByRole("button", { name: "任务", exact: true }).click();
  const title = `待排期任务 ${Date.now()}`;

  await page.getByRole("button", { name: "新建任务", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "新建任务" });
  await dialog.getByLabel("任务标题").fill(title);
  await dialog.getByLabel("创建为待办").check();
  await dialog.getByRole("button", { name: "保存任务", exact: true }).click();
  await page.getByRole("button", { name: /^待办任务/ }).click();

  await expect(page.getByText(title, { exact: true })).toBeVisible();
  await expect(page.getByText("待排期", { exact: true })).toBeVisible();
  const fitsViewport = await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);
  expect(fitsViewport).toBeTruthy();
});
