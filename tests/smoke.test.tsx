import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import Home from "@/app/page";

describe("personal workbench", () => {
  it("renders the personal workbench", async () => {
    render(<Home />);
    expect(await screen.findByRole("heading", { name: "今日工作台" })).toBeInTheDocument();
  });
});
