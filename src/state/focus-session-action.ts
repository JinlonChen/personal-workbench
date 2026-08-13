import type { FocusSession, Workspace } from "@/domain/types";

type FocusSessionInput = Omit<FocusSession, "createdAt">;

export async function persistFocusSession(
  workspace: Workspace,
  input: FocusSessionInput,
  save: (workspace: Workspace) => Promise<void>,
  createdAt = new Date().toISOString(),
) {
  const alreadyStored = workspace.focusSessions.some((session) => session.id === input.id);
  const next = alreadyStored
    ? workspace
    : { ...workspace, focusSessions: [{ ...input, createdAt }, ...workspace.focusSessions] };
  await save(next);
}
