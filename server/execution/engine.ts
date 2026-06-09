import { callOpenAI } from "./providers/openai.js";
import { callAnthropic } from "./providers/anthropic.js";
import { callGoogle } from "./providers/google.js";
import { NODE_SKILLS } from "./skills.js";

export type NodeStatus = "idle" | "running" | "done" | "error" | "paused";

export interface ServerNode {
  id: string;
  typeId: string;
  label: string;
  x: number; y: number;
  width: number; height: number;
  config: Record<string, unknown>;
  status: NodeStatus;
  output: string | null;
  createdBy: string;
  createdAt: number;
}

export interface ServerEdge {
  id: string;
  sourceId: string;
  targetId: string;
  sourcePort: string;
  createdBy: string;
  createdAt: number;
}

export type ReviewDecision = "approved" | "rejected";

export interface ChainCallbacks {
  onNodeStatus: (nodeId: string, status: NodeStatus, output?: string) => void;
  waitForReview: (nodeId: string) => Promise<ReviewDecision>;
}

async function callAI(
  provider: string,
  model: string,
  systemPrompt: string,
  userMessage: string
): Promise<string> {
  switch (provider) {
    case "anthropic": return callAnthropic(model, systemPrompt, userMessage);
    case "google":    return callGoogle(model, systemPrompt, userMessage);
    default:          return callOpenAI(model, systemPrompt, userMessage);
  }
}

function buildGraph(
  nodes: Map<string, ServerNode>,
  edges: Map<string, ServerEdge>
): Map<string, Array<{ targetId: string; sourcePort: string }>> {
  const graph = new Map<string, Array<{ targetId: string; sourcePort: string }>>();
  for (const node of nodes.values()) graph.set(node.id, []);
  for (const edge of edges.values()) {
    const list = graph.get(edge.sourceId);
    if (list) list.push({ targetId: edge.targetId, sourcePort: edge.sourcePort ?? "default" });
  }
  return graph;
}

function findStartNode(nodes: Map<string, ServerNode>): ServerNode | null {
  return Array.from(nodes.values()).find((n) => n.typeId === "start") ?? null;
}

function evaluateCondition(condition: string, output: string): boolean {
  const t = condition.trim();
  const lower = output.toLowerCase();

  // ── Shorthand keywords (most useful for dev workflows) ──────────────────
  // "success" / "passed" — output looks like a successful run
  if (t === "success" || t === "passed") {
    return !lower.includes("error") && !lower.includes("failed") && !lower.includes("fail\n");
  }
  // "failure" / "failed" — output indicates a failure
  if (t === "failure" || t === "failed" || t === "error") {
    return lower.includes("error") || lower.includes("failed") || lower.includes("fail\n");
  }
  // "exit:0" — shell command exited cleanly
  if (/^exit:\s*0$/.test(t)) return output.includes("exitCode: 0") || output.includes('"exitCode":0');
  // "exit:!0" — shell command exited with non-zero code
  if (/^exit:!0$|^exit:\s*non-?zero$/i.test(t)) {
    return !output.includes("exitCode: 0") && !output.includes('"exitCode":0') &&
           /exit[Cc]ode[":]\s*[1-9]/.test(output);
  }

  // ── output.includes("str") or !output.includes("str") ──────────────────
  const includesM = /^(!?)output\.includes\(["'](.*)["']\)$/.exec(t);
  if (includesM) {
    const r = output.includes(includesM[2]);
    return includesM[1] === "!" ? !r : r;
  }

  // ── output.startsWith / endsWith ────────────────────────────────────────
  const startsM = /^(!?)output\.startsWith\(["'](.*)["']\)$/.exec(t);
  if (startsM) { const r = output.startsWith(startsM[2]); return startsM[1] === "!" ? !r : r; }

  const endsM = /^(!?)output\.endsWith\(["'](.*)["']\)$/.exec(t);
  if (endsM) { const r = output.endsWith(endsM[2]); return endsM[1] === "!" ? !r : r; }

  // ── output.length <op> N ────────────────────────────────────────────────
  const lenM = /^output\.length\s*([><=!]+)\s*(\d+)$/.exec(t);
  if (lenM) {
    const n = Number(lenM[2]);
    switch (lenM[1]) {
      case ">":   return output.length > n;
      case "<":   return output.length < n;
      case ">=":  return output.length >= n;
      case "<=":  return output.length <= n;
      case "===": return output.length === n;
      case "!==": return output.length !== n;
    }
  }

  // ── contains:"str" shorthand ─────────────────────────────────────────────
  const containsM = /^(!?)contains:\s*["']?(.+?)["']?$/.exec(t);
  if (containsM) {
    const r = lower.includes(containsM[2].toLowerCase());
    return containsM[1] === "!" ? !r : r;
  }

  if (t === "true") return true;
  if (t === "false") return false;
  return false;
}

const AI_STEP_TYPES = new Set(["agent"]);

async function webSearch(query: string): Promise<string> {
  const apiKey = process.env.BRAVE_API_KEY;
  if (apiKey) {
    const url = `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=5&text_decorations=false`;
    const res = await fetch(url, {
      headers: {
        "Accept": "application/json",
        "X-Subscription-Token": apiKey,
      },
    });
    const json = await res.json() as { web?: { results?: Array<{ title: string; url: string; description: string }> } };
    const results = json.web?.results ?? [];
    return results.map((r, i) =>
      `[${i + 1}] ${r.title}\n${r.url}\n${r.description}`
    ).join("\n\n") || "No results found.";
  }

  // Fallback: DuckDuckGo Instant Answer API (no key required, limited)
  const url = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_redirect=1&no_html=1`;
  const res = await fetch(url, { headers: { "User-Agent": "canview/1.0" } });
  const json = await res.json() as { AbstractText?: string; RelatedTopics?: Array<{ Text?: string; FirstURL?: string }> };
  const parts: string[] = [];
  if (json.AbstractText) parts.push(json.AbstractText);
  const related = (json.RelatedTopics ?? []).slice(0, 5);
  for (const t of related) {
    if (t.Text) parts.push(`• ${t.Text}${t.FirstURL ? ` (${t.FirstURL})` : ""}`);
  }
  return parts.join("\n\n") || `No instant answers found for: ${query}`;
}

interface ContextPayload {
  nodeId: string;
  notes: string;
  content: string;
  spreadToChain: boolean;
}

async function resolveContextNode(node: ServerNode): Promise<ContextPayload> {
  const sourceType = (node.config.sourceType as string) || "text";
  const notes = (node.config.notes as string) || "";
  const spreadToChain = Boolean(node.config.spreadToChain);
  let content = "";

  if (sourceType === "text") {
    content = (node.config.content as string) || "";
  } else if (sourceType === "url") {
    const url = (node.config.url as string) || "";
    if (url) {
      const res = await fetch(url, { headers: { "User-Agent": "canview/1.0" } });
      let text = await res.text();
      const contentType = res.headers.get("content-type") ?? "";
      if (contentType.includes("html")) {
        text = text
          .replace(/<script[\s\S]*?<\/script>/gi, "")
          .replace(/<style[\s\S]*?<\/style>/gi, "")
          .replace(/<[^>]+>/g, " ")
          .replace(/\s{2,}/g, " ")
          .trim();
      }
      content = text.length > 12000 ? text.slice(0, 12000) + "\n[… truncated]" : text;
    }
  } else if (sourceType === "search") {
    const query = (node.config.searchQuery as string) || "";
    if (query) {
      content = await webSearch(query);
    }
  } else if (sourceType === "file") {
    const filePath = (node.config.filePath as string) || "";
    if (filePath) {
      const { readFile } = await import("node:fs/promises");
      const text = await readFile(filePath, "utf-8");
      content = text.length > 10000 ? text.slice(0, 10000) + "\n[… truncated]" : text;
    }
  }

  return { nodeId: node.id, notes, content, spreadToChain };
}

function buildSystemPrompt(role: string, taskDescription: string, customPrompt: string, contextNotes?: string): string {
  const parts: string[] = [];

  // Custom prompt takes full precedence; otherwise fall back to the role's built-in skill
  const primary = customPrompt || NODE_SKILLS[role] || "";
  if (primary) parts.push(primary);

  if (taskDescription) parts.push(`## Task Goal\n${taskDescription}`);
  if (contextNotes) parts.push(`## Provided Context\n${contextNotes}`);

  return parts.join("\n\n---\n\n");
}

export async function runChain(
  nodes: Map<string, ServerNode>,
  edges: Map<string, ServerEdge>,
  callbacks: ChainCallbacks
): Promise<void> {
  const { onNodeStatus, waitForReview } = callbacks;
  const graph = buildGraph(nodes, edges);

  const startNode = findStartNode(nodes);
  if (!startNode) throw new Error("No Start node found in chain");

  const taskDescription = (startNode.config.taskDescription as string) || "";

  // --- Context node pre-pass: resolve all context nodes before chain runs ---
  const contextNodes = Array.from(nodes.values()).filter((n) => n.typeId === "context");
  const resolvedContexts = await Promise.all(
    contextNodes.map(async (n) => {
      onNodeStatus(n.id, "running");
      try {
        const payload = await resolveContextNode(n);
        onNodeStatus(n.id, "done");
        return payload;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        onNodeStatus(n.id, "error", `Context error: ${msg}`);
        return null;
      }
    })
  );
  const validContexts = resolvedContexts.filter((p): p is ContextPayload => p !== null);

  // Build direct injection map: targetNodeId → [ContextPayload]
  const contextFor = new Map<string, ContextPayload[]>();
  for (const payload of validContexts) {
    for (const edge of (graph.get(payload.nodeId) ?? [])) {
      if (!contextFor.has(edge.targetId)) contextFor.set(edge.targetId, []);
      contextFor.get(edge.targetId)!.push(payload);
    }
  }

  // Propagate spread contexts downstream via BFS
  for (const [targetId, contexts] of Array.from(contextFor.entries())) {
    const spreading = contexts.filter((c) => c.spreadToChain);
    if (spreading.length === 0) continue;
    const seen = new Set<string>();
    const queue = [targetId];
    while (queue.length > 0) {
      const nodeId = queue.shift()!;
      if (seen.has(nodeId)) continue;
      seen.add(nodeId);
      if (nodeId !== targetId) {
        if (!contextFor.has(nodeId)) contextFor.set(nodeId, []);
        const existing = contextFor.get(nodeId)!;
        for (const ctx of spreading) {
          if (!existing.includes(ctx)) existing.push(ctx);
        }
      }
      for (const edge of (graph.get(nodeId) ?? [])) queue.push(edge.targetId);
    }
  }

  const visited = new Set<string>();
  const chainMemory = new Map<string, string>(); // key-value store scoped to this run

  // BFS/DFS execution — follows edges from start
  async function executeNode(nodeId: string, inputText: string): Promise<void> {
    if (visited.has(nodeId)) return;
    visited.add(nodeId);

    const node = nodes.get(nodeId);
    if (!node) return;

    onNodeStatus(nodeId, "running");

    let output = "";
    let nextPort = "default";

    try {
      if (node.typeId === "start") {
        // Start node: output is the task description
        output = taskDescription || "No task defined.";

      } else if (AI_STEP_TYPES.has(node.typeId)) {
        // Agent step — role selects built-in skill; custom systemPrompt overrides it entirely
        const provider = (node.config.provider as string) || "openai";
        const model = (node.config.model as string) || "gpt-4o";
        const role = (node.config.role as string) || "investigate";
        const customPrompt = (node.config.systemPrompt as string) || "";

        const injections = contextFor.get(nodeId) ?? [];
        const contextNotesSections = injections
          .filter((c) => c.notes)
          .map((c) => `### Context Note\n${c.notes}`)
          .join("\n\n") || undefined;
        const contentPrepend = injections
          .filter((c) => c.content)
          .map((c) => c.content)
          .join("\n\n---\n\n");

        const systemPrompt = buildSystemPrompt(role, taskDescription, customPrompt, contextNotesSections);
        const userMessage = contentPrepend
          ? `[Provided Context]\n${contentPrepend}\n\n[Task Input]\n${inputText}`
          : inputText;
        output = await callAI(provider, model, systemPrompt, userMessage);

      } else if (node.typeId === "review") {
        // Pause and wait for human decision
        onNodeStatus(nodeId, "paused");
        const decision = await waitForReview(nodeId);
        nextPort = decision === "approved" ? "approved" : "rejected";
        output = decision === "approved" ? "Approved by reviewer." : "Rejected by reviewer.";
        onNodeStatus(nodeId, "done", output);

      } else if (node.typeId === "fork") {
        // Pass-through: fans input to all connected nodes in parallel
        output = inputText;

      } else if (node.typeId === "branch") {
        // AI evaluates a natural-language condition
        const condition = (node.config.condition as string) || "false";
        const provider = (node.config.provider as string) || "openai";
        const model = (node.config.model as string) || "gpt-4o";
        const evalSystem = `You are a condition evaluator. Given the output of a previous step and a condition to check, respond with ONLY the word "true" or "false" (lowercase, no punctuation, nothing else).`;
        const evalUser = `Previous output:\n${inputText}\n\nCondition to evaluate: ${condition}`;
        const evalResult = await callAI(provider, model, evalSystem, evalUser);
        const boolResult = evalResult.trim().toLowerCase().startsWith("true");
        nextPort = boolResult ? "true" : "false";
        output = `Condition "${condition}" → ${boolResult ? "true ✓" : "false ✗"}`;

      } else if (node.typeId === "tool") {
        // HTTP tool call
        const url = (node.config.url as string) || "";
        const method = ((node.config.method as string) || "GET").toUpperCase();
        if (!url) throw new Error("Tool node has no URL configured");
        const res = await fetch(url, {
          method,
          headers: JSON.parse((node.config.headers as string) || "{}") as Record<string, string>,
          body: method !== "GET" && node.config.body ? String(node.config.body) : undefined,
        });
        output = await res.text();

      } else if (node.typeId === "memory") {
        const operation = (node.config.operation as string) || "read";
        const key = (node.config.key as string) || "default";
        if (operation === "write") {
          chainMemory.set(key, inputText);
          output = inputText; // pass through so the chain can continue
        } else {
          output = chainMemory.get(key) ?? `(memory key "${key}" is empty)`;
        }

      } else if (node.typeId === "shell-exec") {
        const command = (node.config.command as string) || "";
        if (!command) throw new Error("Shell Execute node has no command configured");
        const workdir = (node.config.workdir as string) || process.cwd();
        const timeout = Number(node.config.timeout) || 30000;
        const fmt = (node.config.outputFormat as string) || "text";

        const { exec } = await import("node:child_process");
        const { promisify } = await import("node:util");
        const execAsync = promisify(exec);

        let stdout = "", stderr = "", exitCode = 0;
        try {
          const result = await execAsync(command, { cwd: workdir, timeout });
          stdout = result.stdout;
          stderr = result.stderr;
        } catch (err: unknown) {
          const execErr = err as { stdout?: string; stderr?: string; code?: number };
          stdout = execErr.stdout ?? "";
          stderr = execErr.stderr ?? "";
          exitCode = execErr.code ?? 1;
        }

        if (fmt === "json") {
          output = JSON.stringify({ stdout, stderr, exitCode }, null, 2);
        } else {
          const parts: string[] = [];
          if (stdout) parts.push(`stdout:\n${stdout}`);
          if (stderr) parts.push(`stderr:\n${stderr}`);
          parts.push(`exitCode: ${exitCode}`);
          output = parts.join("\n\n");
        }

      } else if (node.typeId === "file-write") {
        const filePath = (node.config.path as string) || "";
        if (!filePath) throw new Error("File Write node has no path configured");
        const mode = (node.config.mode as string) || "write";
        const { writeFile, appendFile, mkdir } = await import("node:fs/promises");
        const { dirname } = await import("node:path");
        await mkdir(dirname(filePath), { recursive: true });
        if (mode === "append") {
          await appendFile(filePath, inputText, "utf-8");
        } else {
          await writeFile(filePath, inputText, "utf-8");
        }
        output = `Written ${inputText.length} chars to ${filePath}`;
      }

      if (node.typeId !== "review") {
        onNodeStatus(nodeId, "done", output);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      onNodeStatus(nodeId, "error", `Error: ${message}`);
      return; // Stop chain on error
    }

    // Follow edges from this node that match the chosen port.
    // Fall back to "default" edges when no named-port match exists (handles
    // chains where edges were created before port-aware connection was in place).
    const outgoing = graph.get(nodeId) ?? [];
    let matching = outgoing.filter((e) =>
      nextPort === "default"
        ? e.sourcePort === "default" || !e.sourcePort
        : e.sourcePort === nextPort
    );
    if (matching.length === 0 && nextPort !== "default") {
      matching = outgoing.filter((e) => e.sourcePort === "default" || !e.sourcePort);
    }

    // Execute all matching next nodes (parallel fan-out if multiple)
    await Promise.all(matching.map((e) => executeNode(e.targetId, output)));
  }

  await executeNode(startNode.id, "");
}
