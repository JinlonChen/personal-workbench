"use client";

import { AppShell } from "@/components/app-shell";
import { AuthGate } from "@/features/auth";
import { AuthProvider } from "@/state/auth-provider";
import { WorkspaceProvider } from "@/state/workspace-provider";

export default function Home() {
  return (
    <AuthProvider>
      <AuthGate>
        <WorkspaceProvider>
          <AppShell />
        </WorkspaceProvider>
      </AuthGate>
    </AuthProvider>
  );
}
