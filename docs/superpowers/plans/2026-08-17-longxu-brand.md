# 龍序 Brand Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将“一页”统一更新为“龍序”，并在核心品牌区域展示“日日自新，事事有序”。

**Architecture:** 只修改现有静态品牌文案、导出标题和版本常量，不引入新的状态或组件。用现有 Vitest 页面测试和导出测试锁定名称与题句，再运行完整质量检查。

**Tech Stack:** Next.js 15、React 19、TypeScript、Vitest、Testing Library

---

### Task 1: 锁定品牌展示行为

**Files:**
- Modify: `tests/smoke.test.tsx`
- Modify: `tests/domain.test.ts`

- [ ] **Step 1: 写入失败测试**

在页面冒烟测试中断言“龍序”和“日日自新，事事有序”可见；将 Markdown 导出标题期望改为“# 龍序 · 个人工作台导出”。

- [ ] **Step 2: 验证测试按预期失败**

Run: `npm test -- tests/smoke.test.tsx tests/domain.test.ts --run`

Expected: FAIL，因为产品仍显示“一页”，导出标题仍为旧名称。

### Task 2: 更新品牌与版本信息

**Files:**
- Modify: `src/app/layout.tsx`
- Modify: `src/features/auth.tsx`
- Modify: `src/components/app-shell.tsx`
- Modify: `src/domain/export.ts`
- Modify: `src/app/version.ts`
- Modify: `src/app/globals.css`
- Modify: `README.md`
- Modify: `package.json`
- Modify: `package-lock.json`

- [ ] **Step 1: 完成最小实现**

将核心入口的“一页”替换为“龍序”，品牌副标题替换为“日日自新，事事有序”，用“龍”字印记替换闪光图标；更新浏览器描述、导出标题、README 和 `v0.2.1` 版本说明。

- [ ] **Step 2: 验证目标测试通过**

Run: `npm test -- tests/smoke.test.tsx tests/domain.test.ts --run`

Expected: 两个测试文件全部 PASS。

### Task 3: 完整验证与发布

**Files:**
- No additional files

- [ ] **Step 1: 运行完整测试、代码检查和生产构建**

Run: `npm test -- --run && npm run lint && npx tsc --noEmit && npm run build`

Expected: 所有命令退出码为 0。

- [ ] **Step 2: 检查变更范围**

Run: `git diff --check && git status --short`

Expected: 无空白错误，且未跟踪 PDF 不在提交范围内。

- [ ] **Step 3: 提交并推送**

Run: `git add README.md package.json package-lock.json src tests docs/superpowers/specs/2026-08-17-longxu-brand-design.md docs/superpowers/plans/2026-08-17-longxu-brand.md && git commit -m "feat: rename workbench to longxu" && git push origin main`

Expected: `origin/main` 更新到新提交。
