import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

const schemaPath = path.resolve(process.cwd(), "supabase/schema.sql");
const schemaExists = existsSync(schemaPath);
const schemaSource = schemaExists ? readFileSync(schemaPath, "utf8") : "";

const tables = ["profiles", "focus_projects", "tasks", "work_entries", "learning_entries", "daily_reviews", "focus_sessions"] as const;
const businessTables = ["focus_projects", "tasks", "work_entries", "learning_entries", "daily_reviews", "focus_sessions"] as const;

function normalizeSql(candidate: string) {
  return candidate.toLowerCase().replace(/\s+/g, " ").trim();
}

function sqlStatements(candidate: string) {
  const uncommented = candidate
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/--[^\r\n]*/g, " ");
  const statements: string[] = [];
  let current = "";
  let quote: "'" | '"' | null = null;
  let dollarTag = "";

  for (let index = 0; index < uncommented.length; index += 1) {
    const character = uncommented[index];

    if (dollarTag) {
      if (uncommented.startsWith(dollarTag, index)) {
        current += dollarTag;
        index += dollarTag.length - 1;
        dollarTag = "";
      } else {
        current += character;
      }
      continue;
    }

    if (quote) {
      current += character;
      if (character === quote) {
        if (uncommented[index + 1] === quote) {
          current += uncommented[index + 1];
          index += 1;
        } else {
          quote = null;
        }
      }
      continue;
    }

    if (character === "'" || character === '"') {
      quote = character;
      current += character;
      continue;
    }

    if (character === "$") {
      const tag = uncommented.slice(index).match(/^\$(?:[a-z_][a-z0-9_]*)?\$/i)?.[0];
      if (tag) {
        dollarTag = tag;
        current += tag;
        index += tag.length - 1;
        continue;
      }
    }

    if (character === ";") {
      const statement = normalizeSql(current);
      if (statement) statements.push(statement);
      current = "";
      continue;
    }

    current += character;
  }

  const trailingStatement = normalizeSql(current);
  if (trailingStatement) statements.push(trailingStatement);
  return statements;
}

function requireStatement(candidate: string, pattern: RegExp, label: string) {
  const matches = sqlStatements(candidate).filter((statement) => pattern.test(statement));
  expect(matches, label).toHaveLength(1);
  return matches[0] ?? "";
}

function replaceRequired(candidate: string, target: string, replacement: string, label: string) {
  const mutated = candidate.replace(target, replacement);
  expect(mutated, `${label} mutation must change the schema`).not.toBe(candidate);
  return mutated;
}

function assertWorkspaceTables(candidate: string) {
  const profiles = requireStatement(candidate, /^create table public\.profiles \(/, "profiles table");
  expect(profiles).toMatch(
    /^create table public\.profiles \( id uuid primary key references auth\.users\(id\) on delete cascade/,
  );

  for (const table of businessTables) {
    const tableDefinition = requireStatement(
      candidate,
      new RegExp(`^create table public\\.${table} \\(`),
      `${table} table`,
    );
    expect(tableDefinition).toMatch(
      new RegExp(
        `^create table public\\.${table} \\( id uuid primary key default gen_random_uuid\\(\\), user_id uuid not null references auth\\.users\\(id\\) on delete cascade`,
      ),
    );
  }
}

function assertDateIndexes(candidate: string) {
  const dateFields = {
    focus_projects: "next_review_date",
    tasks: "task_date",
    work_entries: "entry_date",
    learning_entries: "entry_date",
    daily_reviews: "review_date",
    focus_sessions: "focus_date",
  } as const;

  for (const [table, dateField] of Object.entries(dateFields)) {
    requireStatement(
      candidate,
      new RegExp(
        `^create index(?: if not exists)? ${table}_user_date_idx on public\\.${table} \\(user_id, ${dateField}\\)$`,
      ),
      `${table} must have one user/date index`,
    );
  }
}

function assertRlsEnabled(candidate: string) {
  for (const table of tables) {
    requireStatement(
      candidate,
      new RegExp(`^alter table public\\.${table} enable row level security$`),
      `${table} must enable row level security`,
    );
  }
}

function assertCrudPolicies(candidate: string, table: string, ownerColumn: string) {
  const policyPrefix = `^create policy (?:"[^"]+"|[a-z][a-z0-9_]*) on public\\.${table} for`;
  const ownerCheck = `auth\\.uid\\(\\) = ${ownerColumn}`;
  const policyPatterns = {
    select: new RegExp(`${policyPrefix} select(?: to authenticated)? using \\(${ownerCheck}\\)$`),
    insert: new RegExp(`${policyPrefix} insert(?: to authenticated)? with check \\(${ownerCheck}\\)$`),
    update: new RegExp(
      `${policyPrefix} update(?: to authenticated)? using \\(${ownerCheck}\\) with check \\(${ownerCheck}\\)$`,
    ),
    delete: new RegExp(`${policyPrefix} delete(?: to authenticated)? using \\(${ownerCheck}\\)$`),
  };

  for (const [operation, pattern] of Object.entries(policyPatterns)) {
    requireStatement(candidate, pattern, `${table} must have one owner-scoped ${operation} policy`);
  }
}

function assertUpdatedAtTrigger(candidate: string, table: string) {
  requireStatement(
    candidate,
    new RegExp(
      `^create trigger (?:"[^"]+"|[a-z][a-z0-9_]*) before update on public\\.${table} for each row execute function public\\.set_updated_at\\(\\)$`,
    ),
    `${table} must bind its update trigger to public.set_updated_at`,
  );
}

function assertUpdatedAtFunction(candidate: string) {
  const updatedAtFunction = requireStatement(
    candidate,
    /^create function public\.set_updated_at\(\)/,
    "set_updated_at function",
  );
  expect(updatedAtFunction).toMatch(/\bnew\.updated_at\s*=\s*now\(\)\s*;/);
  expect(updatedAtFunction).toMatch(/\breturn\s+new\s*;/);
}

function assertBoundConstraints(candidate: string) {
  const focusProjects = requireStatement(candidate, /^create table public\.focus_projects \(/, "focus_projects table");
  const tasks = requireStatement(candidate, /^create table public\.tasks \(/, "tasks table");
  const reviews = requireStatement(candidate, /^create table public\.daily_reviews \(/, "daily_reviews table");
  const focusSessions = requireStatement(candidate, /^create table public\.focus_sessions \(/, "focus_sessions table");

  expect(focusProjects).toMatch(
    /\btier text not null default 'parallel' check \(tier in \('top', 'parallel', 'paused'\)\)/,
  );
  expect(focusProjects).toMatch(
    /\bstatus text not null default 'on_track' check \(status in \('on_track', 'attention', 'blocked'\)\)/,
  );
  expect(tasks).toMatch(/\bpriority text not null default 'medium' check \(priority in \('high', 'medium', 'low'\)\)/);
  expect(tasks).toMatch(
    /\bstatus text not null default 'todo' check \(status in \('todo', 'doing', 'done', 'cancelled'\)\)/,
  );
  expect(tasks).toMatch(/\bsource text not null default 'manual' check \(source in \('manual', 'work_entry'\)\)/);
  expect(tasks).toMatch(/\bplacement text not null default 'scheduled' check \(placement in \('scheduled', 'backlog'\)\)/);
  expect(tasks).toMatch(/\bbacklog_kind text check \(backlog_kind in \('unscheduled', 'unexecuted'\)\)/);
  expect(tasks).toMatch(/\boriginal_task_date date/);
  expect(reviews).toMatch(
    /\bmood text not null default 'neutral' check \(mood in \('low', 'neutral', 'steady', 'good', 'great'\)\)/,
  );
  expect(reviews).toMatch(/\benergy smallint not null default 3 check \(energy between 1 and 5\)/);
  expect(reviews).toMatch(/\bunique \(user_id, review_date\)/);
  expect(focusSessions).toMatch(/\bplanned_minutes smallint not null check \(planned_minutes in \(15, 25, 45, 60\)\)/);
  expect(focusSessions).toMatch(/\btask_id uuid references public\.tasks\(id\) on delete set null/);
}

function assertTaskReferenceOwnership(candidate: string) {
  const tasks = requireStatement(candidate, /^create table public\.tasks \(/, "tasks table");
  const workEntries = requireStatement(
    candidate,
    /^create table public\.work_entries \(/,
    "work_entries table",
  );

  expect(tasks).toMatch(/\bunique \(user_id, id\)/);
  expect(workEntries).toMatch(/\buser_id uuid not null references auth\.users\(id\) on delete cascade/);
  expect(workEntries).toMatch(
    /\bforeign key \(user_id, task_id\) references public\.tasks\(user_id, id\) on delete set null \(task_id\)/,
  );
}

function assertSearchIndexes(candidate: string) {
  const expectedFields = {
    tasks: ["title", "description"],
    work_entries: ["title", "content", "result"],
    learning_entries: ["title", "content", "key_points"],
  };

  for (const [table, fields] of Object.entries(expectedFields)) {
    const searchIndex = requireStatement(
      candidate,
      new RegExp(
        `^create index(?: if not exists)? [a-z][a-z0-9_]* on public\\.${table} using gin \\(to_tsvector\\(`,
      ),
      `${table} must have one full-text GIN index`,
    );
    for (const field of fields) {
      expect(searchIndex, `${table} search index must include ${field}`).toContain(`coalesce(${field}, '')`);
    }
  }
}

function assertNoSensitiveCredentials(candidate: string) {
  const forbiddenPatterns = [
    /\bservice_role\b/i,
    /\bsupabase_service_role_key\b/i,
    /\beyj[a-z0-9_-]{10,}\.[a-z0-9_-]{10,}\.[a-z0-9_-]{10,}\b/i,
    /\b(?:sb_secret_|sbp_)[a-z0-9_-]{16,}\b/i,
  ];

  for (const pattern of forbiddenPatterns) expect(candidate).not.toMatch(pattern);
}

describe("Supabase schema contract", () => {
  it("provides all workspace tables with UUID ownership", () => {
    expect(schemaExists, "supabase/schema.sql must exist").toBe(true);
    assertWorkspaceTables(schemaSource);
  });

  it("binds enum and uniqueness constraints to their target columns", () => {
    assertBoundConstraints(schemaSource);
  });

  it("keeps work entry task references within the owning user", () => {
    assertTaskReferenceOwnership(schemaSource);
  });

  it("binds each updated_at trigger to its table", () => {
    assertUpdatedAtFunction(schemaSource);
    for (const table of tables) assertUpdatedAtTrigger(schemaSource, table);
  });

  it("provides date and field-bound search indexes", () => {
    assertDateIndexes(schemaSource);
    assertSearchIndexes(schemaSource);
  });

  it("binds owner-scoped CRUD policies to every RLS table", () => {
    assertRlsEnabled(schemaSource);
    for (const table of tables) {
      assertCrudPolicies(schemaSource, table, table === "profiles" ? "id" : "user_id");
    }
  });

  it("contains no privileged roles or sensitive credentials", () => {
    expect(() => assertNoSensitiveCredentials(schemaSource)).not.toThrow();
  });
});

describe("schema contract regression coverage", () => {
  it("rejects ownership, date indexes, and RLS declarations spoofed by comments", () => {
    const ownershipSpoof = replaceRequired(
      schemaSource,
      "  user_id uuid not null references auth.users(id) on delete cascade,",
      "",
      "remove tasks ownership",
    )
      .concat("\n-- user_id uuid not null references auth.users(id) on delete cascade\n");
    const dateIndexSpoof = replaceRequired(
      schemaSource,
      "create index tasks_user_date_idx on public.tasks (user_id, task_date);",
      "-- create index tasks_user_date_idx on public.tasks (user_id, task_date);",
      "comment out tasks date index",
    );
    const rlsSpoof = replaceRequired(
      schemaSource,
      "alter table public.tasks enable row level security;",
      "-- alter table public.tasks enable row level security;",
      "comment out tasks RLS",
    );

    expect(() => assertWorkspaceTables(ownershipSpoof)).toThrow();
    expect(() => assertDateIndexes(dateIndexSpoof)).toThrow();
    expect(() => assertRlsEnabled(rlsSpoof)).toThrow();
  });

  it("rejects a CRUD policy with the wrong owner column or incomplete update check", () => {
    const wrongOwner = replaceRequired(
      schemaSource,
      "create policy tasks_select_own on public.tasks\nfor select using (auth.uid() = user_id);",
      "create policy tasks_select_own on public.tasks\nfor select using (auth.uid() = id);",
      "change tasks select owner",
    );
    const incompleteUpdate = replaceRequired(
      schemaSource,
      "create policy tasks_update_own on public.tasks\nfor update using (auth.uid() = user_id) with check (auth.uid() = user_id);",
      "create policy tasks_update_own on public.tasks\nfor update using (auth.uid() = user_id);",
      "remove tasks update check",
    );

    expect(() => assertCrudPolicies(wrongOwner, "tasks", "user_id")).toThrow();
    expect(() => assertCrudPolicies(incompleteUpdate, "tasks", "user_id")).toThrow();
  });

  it("rejects a trigger whose function is not bound to the target table", () => {
    const invalidTrigger = replaceRequired(
      schemaSource,
      "create trigger tasks_set_updated_at\nbefore update on public.tasks\nfor each row execute function public.set_updated_at();",
      "create trigger tasks_set_updated_at\nbefore update on public.tasks\nfor each row execute function public.other_function();",
      "change tasks trigger function",
    );

    expect(() => assertUpdatedAtTrigger(invalidTrigger, "tasks")).toThrow();
  });

  it("rejects a no-op or incomplete set_updated_at function", () => {
    const noOpFunction = replaceRequired(
      schemaSource,
      "  new.updated_at = now();\n",
      "",
      "remove updated_at assignment",
    );
    const missingReturn = replaceRequired(
      schemaSource,
      "  return new;",
      "  return null;",
      "replace trigger return value",
    );

    expect(() => assertUpdatedAtFunction(noOpFunction)).toThrow();
    expect(() => assertUpdatedAtFunction(missingReturn)).toThrow();
  });

  it("rejects constraints spoofed by comments or attached to another table", () => {
    const priorityConstraint = "check (priority in ('high', 'medium', 'low'))";
    const uniquenessConstraint = "unique (user_id, review_date)";
    const withoutPriority = replaceRequired(
      schemaSource,
      priorityConstraint,
      "",
      "remove priority constraint",
    );
    const withoutConstraints = replaceRequired(
      withoutPriority,
      uniquenessConstraint,
      "",
      "remove daily review uniqueness",
    );
    const spoofedByComments = withoutConstraints
      .concat(`\n-- ${priorityConstraint}\n/* ${uniquenessConstraint} */\n`);

    expect(() => assertBoundConstraints(spoofedByComments)).toThrow();
  });

  it("rejects a search index that omits a required field expression", () => {
    const incompleteSearch = replaceRequired(
      schemaSource,
      "coalesce(result, '')",
      "coalesce(title, '')",
      "remove work entry result from search index",
    );
    expect(() => assertSearchIndexes(incompleteSearch)).toThrow();
  });

  it("rejects privileged role names and realistic secret formats", () => {
    const sensitiveValues = [
      "service_role",
      "SUPABASE_SERVICE_ROLE_KEY",
      "eyJhbGciOiJIUzI1NiJ9.eyJyb2xlIjoic2VydmljZV9yb2xlIn0.signature1234567890",
      "sb_secret_1234567890abcdefghijklmnopqrstuvwxyz",
      "sbp_1234567890abcdefghijklmnopqrstuvwxyz",
    ];

    for (const sensitiveValue of sensitiveValues) {
      expect(() => assertNoSensitiveCredentials(`${schemaSource}\n${sensitiveValue}`)).toThrow();
    }
  });
});
