import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  outputFileTracingRoot: process.cwd(),
  output: "export",
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
  basePath: process.env.GITHUB_ACTIONS === "true"
    ? `/${process.env.GITHUB_REPOSITORY?.split("/")[1] ?? "personal-workbench"}`
    : "",
};

export default nextConfig;
