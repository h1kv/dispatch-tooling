import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";
// @ts-expect-error — the CLI is plain ESM JS with no type declarations.
import { parseFlags } from "../bin/dispatch.mjs";
import {
  hydrateWorkspaceState,
  resetWorkspaceForTests,
  setWorkspaceStateFileForTests,
} from "../server/features/state/store.js";

const CLI = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "bin", "dispatch.mjs");

test("cli parseFlags separates commands, valued flags, and boolean flags", () => {
  const { flags, rest } = parseFlags(["start", "--port", "4000", "--prod"]);
  assert.deepEqual(rest, ["start"]);
  assert.equal(flags.port, "4000");
  assert.equal(flags.prod, true);
});

test("cli version prints a semver", () => {
  const out = execFileSync("node", [CLI, "version"], { encoding: "utf8" }).trim();
  assert.match(out, /^\d+\.\d+\.\d+/);
});

test("cli help lists the core commands", () => {
  const out = execFileSync("node", [CLI, "help"], { encoding: "utf8" });
  assert.match(out, /dispatch <command>/);
  for (const cmd of ["start", "init", "doctor"]) assert.match(out, new RegExp(`\\b${cmd}\\b`));
});

test("cli rejects an unknown command with a non-zero exit", () => {
  assert.throws(() => execFileSync("node", [CLI, "definitely-not-a-command"], { stdio: "pipe" }));
});

test("cli workspace new creates a v2 state file the server can hydrate", () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), "dispatch-ws-"));
  execFileSync("node", [CLI, "workspace", "new", "demo"], {
    env: { ...process.env, DISPATCH_WORKSPACE_STATE_DIR: dir },
    stdio: "pipe",
  });
  const file = path.join(dir, "demo.json");
  assert.equal(existsSync(file), true);

  // The file the CLI wrote must be loadable by the real store.
  resetWorkspaceForTests();
  setWorkspaceStateFileForTests(file);
  assert.equal(hydrateWorkspaceState(), true);
});
