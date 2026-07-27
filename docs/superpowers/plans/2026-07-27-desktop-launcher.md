# Desktop Launcher Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a double-clickable macOS desktop launcher that starts the local workbench on demand and opens it in the default browser.

**Architecture:** Keep the launcher script inside the project so it is versionable and maintainable. Expose it through a Desktop symlink named `启动个人工作台.command`; the script checks for an existing healthy server, starts `npm run dev` on `0.0.0.0:3100` only when needed, waits for HTTP readiness, and opens `http://localhost:3100`.

**Tech Stack:** zsh, curl, macOS `open`, Next.js development server.

---

### Task 1: Add the macOS launcher script

**Files:**
- Create: `scripts/start-workbench.command`

- [ ] **Step 1: Create the executable launcher with explicit project and URL checks**

Create `scripts/start-workbench.command` with this behavior:

```zsh
#!/bin/zsh
set -u

PROJECT_DIR="/Users/jinlongchen/Desktop/个人平台"
URL="http://localhost:3100/"

fail() {
  print -u2 "启动失败：$1"
  print -u2 "按任意键关闭此窗口。"
  read -k 1
  exit 1
}

[[ -d "$PROJECT_DIR" ]] || fail "找不到项目目录：$PROJECT_DIR"
command -v npm >/dev/null 2>&1 || fail "找不到 npm，请先安装 Node.js。"
[[ -f "$PROJECT_DIR/package.json" ]] || fail "项目中找不到 package.json。"

if curl -fsS --max-time 2 "$URL" >/dev/null 2>&1; then
  open "$URL"
  print "个人工作台已经在运行，已打开浏览器。"
  exit 0
fi

cd "$PROJECT_DIR" || fail "无法进入项目目录。"
npm run dev -- --hostname 0.0.0.0 --port 3100 &
SERVER_PID=$!

cleanup() {
  kill "$SERVER_PID" 2>/dev/null || true
}
trap cleanup INT TERM EXIT

for attempt in {1..60}; do
  if curl -fsS --max-time 2 "$URL" >/dev/null 2>&1; then
    open "$URL"
    print "个人工作台已启动：$URL"
    wait "$SERVER_PID"
    exit 0
  fi

  if ! kill -0 "$SERVER_PID" 2>/dev/null; then
    fail "服务器进程提前退出，请查看上方日志。"
  fi
  sleep 1
done

fail "服务器在 60 秒内没有准备好。"
```

- [ ] **Step 2: Verify the script is syntactically valid**

Run: `zsh -n scripts/start-workbench.command`

Expected: exit code `0` and no output.

- [ ] **Step 3: Make the script executable**

Run: `chmod +x scripts/start-workbench.command`

Expected: `test -x scripts/start-workbench.command` succeeds.

### Task 2: Create and verify the Desktop entry point

**Files:**
- Create: `/Users/jinlongchen/Desktop/启动个人工作台.command` (symlink to `scripts/start-workbench.command`)

- [ ] **Step 1: Create the Desktop symlink**

Run:

```bash
ln -sfn "/Users/jinlongchen/Desktop/个人平台/scripts/start-workbench.command" "/Users/jinlongchen/Desktop/启动个人工作台.command"
```

Expected: `readlink "/Users/jinlongchen/Desktop/启动个人工作台.command"` prints the project script path.

- [ ] **Step 2: Test the already-running path**

With the development server running, execute:

```bash
"/Users/jinlongchen/Desktop/个人平台/scripts/start-workbench.command"
```

Expected: it opens `http://localhost:3100/` and exits without starting a second server.

- [ ] **Step 3: Test the cold-start path**

Stop the development server, double-click `/Users/jinlongchen/Desktop/启动个人工作台.command`, and wait for the terminal log.

Expected: one Next.js server starts on port `3100`, the browser opens after the HTTP readiness check, and the terminal remains open for logs. Pressing `Control + C` stops that server.

### Task 3: Final verification

- [ ] **Step 1: Re-run shell syntax and project checks**

Run:

```bash
zsh -n scripts/start-workbench.command
npm test -- --run
npm run lint
npx tsc --noEmit
```

Expected: all commands exit with code `0`; the launcher does not change application data.

The project has no Git repository, so no commit or branch operation is performed.
