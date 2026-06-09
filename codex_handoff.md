# Canvax — Codex Handoff

Visual workflow builder for AI agent chains. React 19 + Vite 7 frontend, Express + WebSocket backend. Canvas rendered with HTML Canvas 2D API. No database — all state lives in-memory on the server and is broadcast via WebSocket.

## Architecture Overview

```
┌─────────────────────────────────────────────────────┐
│  Browser (React 19, Vite 7)                         │
│  ┌──────────┐  ┌─────────────┐  ┌────────────────┐ │
│  │ Whiteboard│  │  Sidebar    │  │   ChatPanel    │ │
│  │ (canvas) │  │ (toolbox +  │  │ (Auto/Plan/    │ │
│  │          │  │  properties)│  │  Review modes) │ │
│  └──────────┘  └─────────────┘  └────────────────┘ │
│          ↕ WebSocket (JSON messages)                │
│  ┌─────────────────────────────────────────────────┐│
│  │  useSocket.ts — single WS connection            ││
│  │  CustomEvent "canvax:chat" for chat responses   ││
│  └─────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────┘
            ↕ ws://host/ws
┌─────────────────────────────────────────────────────┐
│  Server (Express + ws, tsx --env-file=.env)         │
│  ┌──────────────┐  ┌──────────────┐                │
│  │ state/store  │  │ execution/   │                │
│  │ (nodes, edges│  │ engine.ts    │                │
│  │  Map in-mem) │  │ (chain runner│                │
│  └──────────────┘  │  + AI calls) │                │
│                    └──────────────┘                │
│  ┌────────────────────────────────────────────────┐│
│  │  ws/dispatch.ts — routes all WS message types  ││
│  └────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────┘
```

## Node Types

| ID | Label | Category | Color | Purpose |
|---|---|---|---|---|
| `start` | Start | start | `#16825d` | Entry point, task description |
| `agent` | Agent Step | ai-step | dynamic by role | AI call with selectable role |
| `review` | Review | review | `#e65100` | Human checkpoint (approve/reject) |
| `branch` | Condition | control | `#78909c` | AI-evaluated true/false route |
| `fork` | Parallel | control | `#7b1fa2` | Fan-out to N nodes simultaneously |
| `memory` | Memory | memory | `#c2185b` | Write/read in-chain key-value store |
| `context` | Context | context | `#f57c00` | Inject text/URL/search/file into AI nodes |
| `shell-exec` | Shell Execute | tool | `#37474f` | Run shell command, capture output |
| `file-write` | File Write | tool | `#5d4037` | Write/append text to disk |
| `tool` | API Request | tool | `#0097a7` | HTTP fetch |

### Agent Step Roles

The `agent` node has a `role` config field that selects the built-in skill prompt:

- `investigate` — research analyst
- `plan` — strategic planner
- `design` — senior designer
- `create` — expert creator
- `evaluate` — critical evaluator
- `document` — technical writer
- `custom` — freeform; requires custom `systemPrompt`

If `systemPrompt` is set in config, it **fully overrides** the role's built-in skill.

## Chain Execution

`server/execution/engine.ts — runChain()`

1. **Context pre-pass** — all `context` nodes resolved concurrently (fetch URL, read file, search web). Result injected into target nodes via `contextFor: Map<nodeId, ContextPayload[]>`. If `spreadToChain=true`, injects into all downstream nodes via BFS.

2. **Traversal** — DFS from Start node, following output port edges. Fork nodes run all outgoing edges with `Promise.all`.

3. **Per-node execution**:
   - `start` → outputs `taskDescription`
   - `agent` → builds system prompt from role skill + custom prompt + context notes, calls AI, prepends context content to user message
   - `review` → `waitForReview()` suspends until `review:approve/reject` WS arrives
   - `branch` → AI evaluates condition, routes `true`/`false`
   - `memory write` → stores input in `chainMemory` Map, passes through
   - `memory read` → outputs stored value from `chainMemory`
   - `fork` → passes input to all connected nodes in parallel
   - `shell-exec` → `child_process.exec`, captures stdout/stderr/exitCode
   - `file-write` → `fs.writeFile` / `appendFile`
   - `tool` → `fetch(url)` with configured method/headers/body

4. **`chainMemory`** — `Map<string, string>` scoped to one chain run, shared across all nodes in the run. Enables store-then-retrieve patterns.

## WebSocket Protocol

All messages are JSON. Server broadcasts to all connected clients.

```
Client → Server:
  { type: "join", name: string }
  { type: "node:create", typeId, position, label? }
  { type: "node:update", nodeId, patch }
  { type: "node:config:update", nodeId, config }
  { type: "node:delete", nodeId }
  { type: "edge:create", sourceId, targetId, sourcePort }
  { type: "edge:delete", edgeId }
  { type: "cursor:move", point }
  { type: "chain:run" }
  { type: "chain:stop" }
  { type: "review:approve", nodeId }
  { type: "review:reject", nodeId }
  { type: "chat:message", content, mode, answers? }
  { type: "chat:apply", operations }

Server → Clients (broadcast):
  { type: "init", selfId, users, nodes, edges, nodeTypes }
  { type: "user:joined", user }
  { type: "user:left", userId }
  { type: "node:created", node }
  { type: "node:updated", node }
  { type: "node:deleted", nodeId, edgeIds }
  { type: "edge:created", edge }
  { type: "edge:deleted", edgeId }
  { type: "node:status", nodeId, status, output? }
  { type: "chain:started" }
  { type: "chain:complete" }
  { type: "chain:error", message }

Server → requesting client only:
  { type: "chat:response", response, responseMode, questions?, operations? }
  { type: "chat:error", message }
```

## Chat System

`server/ws/handlers/chat.ts`

Modes:
- **Auto** — operations applied immediately after AI responds
- **Plan** — AI asks clarifying questions first; user answers submitted back; then operations applied
- **Review** — AI sends operations as a preview; user clicks "Apply" to execute

Canvas state (nodes + edges) is serialized into the prompt on every message. AI responds with JSON `{ response, operations?, questions? }`.

Operations use `tmpId` to reference newly-created nodes within the same batch (two-pass: create nodes first, then edges).

### Chat WS Timing Fix

`useSocket.ts` dispatches `window.CustomEvent("canvax:chat")` for chat messages instead of trying to pass the event to ChatPanel directly. ChatPanel listens on `window` via `addEventListener("canvax:chat", ...)`. This avoids the mount-timing race where ChatPanel mounts before the socket connects.

## Rendering

`src/whiteboard/render.ts`

- HiDPI-aware (`devicePixelRatio`)
- Node cards: rounded rect, accent header band, status dot, body preview text, port dots
- `agent` nodes: accent color derived from `config.role` (each role has its own color)
- Header label for `agent` nodes shows the role name (e.g., "INVESTIGATE"), not the type label
- Context edges (source category === `"context"`): amber dashed, enter target at left-center port
- Output ports: bottom center (single) or spaced (multi-port for review/branch)
- Input port: top center (all nodes except start/context)
- Left-side dotted amber circle: context input indicator on ai-step/review/control/tool/memory nodes
- Running nodes: pulsing glow shadow + edge dash animation

## Key Files

```
src/
  types/index.ts                 — BoardNode, BoardEdge, NodeTypeConfig, NodeStatus
  whiteboard/
    config/nodeTypes.ts          — NODE_TYPES array (single source of truth for toolbox)
    render.ts                    — Canvas drawing functions
    geometry.ts                  — worldToScreen, snapToGrid, hitTest
    hooks/
      useSocket.ts               — WebSocket connection + all WS message handling
      useInteraction.ts          — Mouse/touch event handling (drag, connect, place)
    components/
      Whiteboard.tsx             — Top-level canvas orchestrator
      Sidebar.tsx                — Toolbox + properties panel + ChatPanel wrapper
      TitleBar.tsx               — Run button, connection status
      ChatPanel.tsx              — Chat UI (modes, message history, plan questions, op preview)

server/
  index.ts                       — Express + static serving
  state/
    store.ts                     — nodes, edges Maps; send/broadcast helpers
    operations.ts                — createNode, createEdge, updateNode, deleteNode
  ws/
    server.ts                    — WebSocket server setup
    dispatch.ts                  — Routes all incoming WS message types
    handlers/
      join.ts, node.ts, edge.ts  — CRUD handlers
      chain.ts                   — handleChainRun, handleReviewApprove/Reject
      chat.ts                    — handleChatMessage, handleChatApply, applyOperations
  execution/
    engine.ts                    — runChain (DFS traversal + per-node execution)
    skills.ts                    — NODE_SKILLS: built-in system prompts per role
    providers/
      openai.ts                  — callOpenAI(model, systemPrompt, userMessage)
      anthropic.ts               — callAnthropic(...)
      google.ts                  — callGoogle(...)
```

## Environment Variables

```
OPENAI_API_KEY=        # required for agent nodes + chat + branch condition
ANTHROPIC_API_KEY=     # optional, for agent nodes with provider: anthropic
GOOGLE_API_KEY=        # optional, for agent nodes with provider: google
BRAVE_API_KEY=         # optional, for web search in context nodes (falls back to DuckDuckGo)
```

## Running Locally

```bash
npm install
npm run dev    # Vite + tsx server concurrently on :5173 / :3001
```

## Known Gaps / Next Steps

1. **Loop/Retry node** — not implemented. Would need cycle detection in the engine.
2. **Context node UX** — left-side port is visually subtle; could be clearer
3. **Chat history** — per-session only; no persistence
4. **Tool/API node** — functional but basic; no auth, no JSON body builder
5. **Memory across runs** — `chainMemory` resets each run; no persistent store
6. **Streaming AI output** — currently awaits full response; streaming would improve UX for long outputs
