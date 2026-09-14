import { describe, expect, it } from "vitest";

import { groupRecordsByMonth, recentMonthKeys } from "@/features/records";
import type { ThoughtEntry } from "@/domain/types";

const entry = (id: string, entryDate: string, title: string): ThoughtEntry => ({
  id,
  entryDate,
  title,
  content: `${title} 内容`,
  tags: [],
  createdAt: `${entryDate}T09:00:00.000Z`,
  updatedAt: `${entryDate}T09:00:00.000Z`,
});

describe("record month lists", () => {
  it("returns the current month and previous two months in descending order", () => {
    expect(recentMonthKeys("2026-09-12")).toEqual(["2026-09", "2026-08", "2026-07"]);
  });

  it("groups records by the selected three month keys and sorts newest first", () => {
    const records = [
      entry("july", "2026-07-31", "七月"),
      entry("september", "2026-09-02", "九月"),
      entry("august", "2026-08-20", "八月"),
      entry("older", "2026-06-30", "更早"),
      entry("september-new", "2026-09-12", "九月最新"),
    ];

    const groups = groupRecordsByMonth(records, recentMonthKeys("2026-09-12"));

    expect(groups.map((group) => group.key)).toEqual(["2026-09", "2026-08", "2026-07"]);
    expect(groups[0].entries.map((item) => item.title)).toEqual(["九月最新", "九月"]);
    expect(groups[1].entries.map((item) => item.title)).toEqual(["八月"]);
    expect(groups[2].entries.map((item) => item.title)).toEqual(["七月"]);
    expect(groups.flatMap((group) => group.entries).map((item) => item.title)).not.toContain("更早");
  });
});
