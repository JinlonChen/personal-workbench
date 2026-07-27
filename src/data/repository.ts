import type { Workspace } from "@/domain/types";

export interface WorkspaceRepository {
  load(): Promise<Workspace>;
  save(workspace: Workspace): Promise<void>;
  clear(): Promise<void>;
}
