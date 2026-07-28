import { describe, expect, it } from "vitest";

import { getEmailRedirectTo } from "@/data/auth-redirect";

describe("getEmailRedirectTo", () => {
  it("uses the configured Supabase Site URL for GitHub Pages", () => {
    expect(getEmailRedirectTo(new URL("https://jinlongchen.github.io/personal-workbench/"))).toBeUndefined();
  });

  it("uses the configured Supabase Site URL for a custom production domain", () => {
    expect(getEmailRedirectTo(new URL("https://jinlongchen.com/personal-workbench/"))).toBeUndefined();
  });

  it("returns to the current local development page", () => {
    expect(getEmailRedirectTo(new URL("http://localhost:3100/"))).toBe("http://localhost:3100/");
  });
});
