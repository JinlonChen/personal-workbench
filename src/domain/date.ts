export function todayKey(timezone = "Asia/Shanghai", date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

export function nextDate(date: string): string {
  const noon = new Date(`${date}T12:00:00.000Z`);
  if (Number.isNaN(noon.getTime())) throw new Error("日期格式无效");
  noon.setUTCDate(noon.getUTCDate() + 1);
  return noon.toISOString().slice(0, 10);
}

export function formatDate(date: string, options?: Intl.DateTimeFormatOptions): string {
  return new Intl.DateTimeFormat("zh-CN", {
    month: "long",
    day: "numeric",
    weekday: "short",
    timeZone: "UTC",
    ...options,
  }).format(new Date(`${date}T12:00:00.000Z`));
}
