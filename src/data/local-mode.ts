export function isLocalModeRequested(search: string): boolean {
  return new URLSearchParams(search).get("local") === "1";
}
