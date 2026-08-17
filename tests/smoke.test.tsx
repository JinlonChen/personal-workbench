import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import Home from "@/app/page";

describe("personal workbench", () => {
  it("renders the personal workbench", async () => {
    render(<Home />);
    expect(await screen.findByRole("heading", { name: "今日工作台" })).toBeInTheDocument();
    expect(screen.getAllByText("龍序", { exact: true })).toHaveLength(2);
    expect(screen.getByText("日日自新，事事有序", { exact: true })).toBeInTheDocument();
    const brandMark = screen.getByRole("img", { name: "龍字标识" });
    expect(brandMark.tagName).toBe("IMG");
    expect(brandMark.getAttribute("src")).toContain("longxu-dragon");
  });
});
