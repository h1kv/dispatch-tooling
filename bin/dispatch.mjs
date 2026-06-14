#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────
// dispatch — the DISPATCH.AI command-line interface
//
// Dependency-free (Node built-ins only) so it runs anywhere Node ≥ 20 does.
// Commands: start | dev | init | doctor | version | help
// ─────────────────────────────────────────────────────────────────────────
import { spawn } from "node:child_process";
import { existsSync, copyFileSync, mkdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

const C = {
  reset: "\x1b[0m", bold: "\x1b[1m", dim: "\x1b[2m",
  accent: "\x1b[38;5;99m", green: "\x1b[32m", red: "\x1b[31m", yellow: "\x1b[33m",
};
const tty = process.stdout.isTTY;
const c = (color, s) => (tty ? `${C[color]}${s}${C.reset}` : s);
const log = (...a) => console.log(...a);

function pkg() {
  try { return JSON.parse(readFileSync(path.join(ROOT, "package.json"), "utf8")); }
  catch { return { version: "0.0.0" }; }
}

function parseFlags(argv) {
  const flags = {};
  const rest = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith("--")) {
      const key = a.slice(2);
      const next = argv[i + 1];
      if (next !== undefined && !next.startsWith("--")) { flags[key] = next; i++; }
      else flags[key] = true;
    } else rest.push(a);
  }
  return { flags, rest };
}

function run(cmd, args, env = {}) {
  return new Promise((resolve) => {
    const child = spawn(cmd, args, {
      cwd: ROOT, stdio: "inherit", shell: process.platform === "win32",
      env: { ...process.env, ...env },
    });
    child.on("exit", (code) => resolve(code ?? 0));
    child.on("error", (err) => {
      log(c("red", `✖ failed to run ${cmd}: ${err.message}`));
      resolve(1);
    });
  });
}

// ── commands ─────────────────────────────────────────────────────────────
async function cmdStart(flags) {
  const port = flags.port ? String(flags.port) : undefined;
  const env = port ? { PORT: port } : {};
  if (flags.prod) {
    log(c("accent", "› building for production…"));
    const code = await run("npm", ["run", "build"]);
    if (code !== 0) return code;
    log(c("accent", "› starting production server…"));
    return run("npm", ["run", "preview"], env);
  }
  log(c("accent", "› starting DISPATCH.AI…"));
  return run("npm", ["run", "dev"], env);
}

function cmdInit() {
  log(c("bold", "Initialising DISPATCH.AI workspace\n"));
  const envPath = path.join(ROOT, ".env");
  const examplePath = path.join(ROOT, ".env.example");
  if (existsSync(envPath)) {
    log(c("dim", "  .env already exists — leaving it untouched"));
  } else if (existsSync(examplePath)) {
    copyFileSync(examplePath, envPath);
    log(c("green", "  ✓ created .env from .env.example"));
    log(c("yellow", "  → add at least one provider key (OPENAI_API_KEY / ANTHROPIC_API_KEY / GOOGLE_API_KEY)"));
  } else {
    log(c("red", "  ✖ no .env.example found"));
  }
  for (const dir of ["workspace", "vercel-workspaces", ".dispatch"]) {
    const p = path.join(ROOT, dir);
    if (!existsSync(p)) { mkdirSync(p, { recursive: true }); log(c("green", `  ✓ created ${dir}/`)); }
  }
  log(c("dim", "\n  next: dispatch doctor   then   dispatch start"));
  return 0;
}

function readEnvFile() {
  const envPath = path.join(ROOT, ".env");
  if (!existsSync(envPath)) return {};
  const out = {};
  for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m) out[m[1]] = m[2];
  }
  return out;
}

function cmdDoctor() {
  log(c("bold", "DISPATCH.AI · doctor\n"));
  let ok = true;
  const check = (label, pass, hint = "") => {
    log(`  ${pass ? c("green", "✓") : c("red", "✖")} ${label}${pass || !hint ? "" : c("dim", `  — ${hint}`)}`);
    if (!pass) ok = false;
  };

  const major = Number(process.versions.node.split(".")[0]);
  check(`Node.js ${process.versions.node} (≥ 20)`, major >= 20, "install Node 20+");
  check("dependencies installed", existsSync(path.join(ROOT, "node_modules")), "run: npm install");
  const env = readEnvFile();
  check(".env present", existsSync(path.join(ROOT, ".env")), "run: dispatch init");
  const providers = ["OPENAI_API_KEY", "ANTHROPIC_API_KEY", "GOOGLE_API_KEY"].filter((k) => env[k]);
  check(`a model provider key (${providers.join(", ") || "none"})`, providers.length > 0, "add a provider key to .env");
  check("voice control configured (optional)", Boolean(env.RTM_OPENAI), "set RTM_OPENAI to enable the VoiceOrb");

  log("");
  log(ok ? c("green", "  All required checks passed — run: dispatch start")
        : c("yellow", "  Some checks failed — fix the items above, then re-run dispatch doctor"));
  return ok ? 0 : 1;
}

function cmdHelp() {
  const { version } = pkg();
  log(`
${c("bold", "DISPATCH.AI")} ${c("dim", `v${version}`)} — the canvas for agents

${c("bold", "Usage")}
  dispatch <command> [options]

${c("bold", "Commands")}
  ${c("accent", "start")}            Start the app (dev server)         ${c("dim", "[--port N] [--prod]")}
  ${c("accent", "init")}             Scaffold .env + workspace dirs
  ${c("accent", "doctor")}           Check your environment is ready
  ${c("accent", "version")}          Print the version
  ${c("accent", "help")}             Show this help

${c("bold", "Examples")}
  ${c("dim", "dispatch init && dispatch doctor")}
  ${c("dim", "dispatch start --port 4000")}
  ${c("dim", "dispatch start --prod")}

${c("dim", "Docs: https://github.com/h1kv/dispatch-tooling")}
`);
  return 0;
}

// ── dispatch ────────────────────────────────────────────────────────────
async function main() {
  const { flags, rest } = parseFlags(process.argv.slice(2));
  const command = rest[0] || (flags.version ? "version" : flags.help ? "help" : "help");
  let code = 0;
  switch (command) {
    case "start": code = await cmdStart(flags); break;
    case "dev": code = await cmdStart({ ...flags, prod: false }); break;
    case "init": code = cmdInit(); break;
    case "doctor": code = cmdDoctor(); break;
    case "version": log(pkg().version); break;
    case "help": cmdHelp(); break;
    default:
      log(c("red", `Unknown command: ${command}\n`));
      cmdHelp();
      code = 1;
  }
  process.exit(code);
}

// Export pieces for tests; only run when invoked directly.
export { parseFlags, readEnvFile };
const invokedDirectly = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invokedDirectly) main();
