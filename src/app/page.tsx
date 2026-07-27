"use client";

import { AppShell } from "@/components/app-shell";
import { WorkspaceProvider } from "@/state/workspace-provider";

export default function Home() {
  return (
    <WorkspaceProvider>
      <AppShell />
    </WorkspaceProvider>
  );
}
