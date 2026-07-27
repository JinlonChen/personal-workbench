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
