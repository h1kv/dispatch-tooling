# Canvax — Node Reference

Each node in an execution chain has a specific role. Connect them top-to-bottom to build an AI workflow that runs automatically when you press **Run**.

---

## Chain Steps

These nodes appear in sequence and pass their output to the next connected node.

### Start
The entry point of every chain. Nothing runs without it.
- **Task Description** — the overall goal given to every downstream AI step as context.
- **Default Provider / Model** — the fallback AI provider and model used when a step doesn't override it.
- Output: the task description text, passed to the next node.

### Investigate
Sends the previous output to an AI and instructs it to research and gather information.
- **System Prompt** — defines the researcher persona (e.g. "You are a thorough researcher…").
- **Provider / Model** — OpenAI, Anthropic, or Google; choose any model from that provider.
- Output: the AI's research findings, passed to the next node.

### Plan
Takes the previous output and produces a structured plan or roadmap.
- **System Prompt** — defines the planning persona.
- **Provider / Model** — independent provider/model choice per node.
- Output: a structured plan document.

### Design
Produces a detailed design, specification, or architecture based on the plan.
- **System Prompt** — defines the designer persona.
- **Provider / Model** — independent per node.
- Output: a design document or specification.

### Create
Generates the actual output — code, content, a draft, or any artefact.
- **System Prompt** — defines the creator/writer persona.
- **Provider / Model** — independent per node.
- Output: the generated artefact (code, prose, etc.).

### Evaluate
Reviews and critiques the output from the previous step for quality and correctness.
- **System Prompt** — defines the evaluator/critic persona.
- **Provider / Model** — independent per node.
- Output: a critique or quality report.

### Document
Produces documentation, summaries, changelogs, or reports from the previous output.
- **System Prompt** — defines the technical writer persona.
- **Provider / Model** — independent per node.
- Output: formatted documentation.

---

## Control

These nodes alter the flow of the chain rather than generating content.

### Review *(human checkpoint)*
Pauses the chain and waits for a human decision before continuing.
- No configuration needed.
- When the chain reaches this node, it stops and shows **Approve / Reject** buttons in the sidebar and on the canvas.
- **Approve** → chain continues down the *Approved* port.
- **Reject** → chain continues down the *Rejected* port.
- Output ports: **Approved**, **Rejected** (connect different branches to each).

### Condition *(branch)*
Evaluates a condition against the previous node's output and routes to either the True or False port.
- **Condition** — a simple expression using:
  - `output.includes("text")`
  - `output.startsWith("text")`
  - `output.endsWith("text")`
  - `output.length > N` (or `<`, `>=`, `<=`, `===`, `!==`)
  - `!output.includes("text")` (negation)
  - `true` / `false`
- Output ports: **True**, **False**.
- Example: `output.includes("error")` → routes to True if the word "error" appears in the previous output.

---

## Utilities

These nodes handle external interactions and storage.

### Tool Call *(HTTP request)*
Calls an external API, webhook, or endpoint.
- **URL** — the endpoint to call.
- **Method** — GET, POST, PUT, PATCH, DELETE.
- **Headers** — JSON object (e.g. `{"Authorization": "Bearer token"}`).
- **Body** — request body for non-GET requests (the previous node's output is available as context).
- Output: the raw response text from the endpoint.

### Memory *(context store)*
Reads from or writes to a shared in-chain memory store, allowing nodes to share state beyond the linear flow.
- **Operation** — Read or Write.
- **Key** — the memory slot name.
- Output: the stored value (Read) or the input text (Write, passed through).

### File Write *(disk)*
Writes or appends the previous node's output to a file on the server's filesystem.
- **File Path** — relative or absolute path (e.g. `output/report.md`). Directories are created automatically.
- **Mode**:
  - **Overwrite** — replaces the file contents.
  - **Append** — adds to the end of the existing file.
- Output: a confirmation string with byte count and path.

---

## Execution & Status

| Status | Colour | Meaning |
|---|---|---|
| idle | gray | Node has not run yet |
| running | blue (pulsing) | Node is currently executing |
| done | green | Node completed successfully |
| paused | orange | Review node waiting for human input |
| error | red | Node failed; chain stopped on that branch |

**Run** — starts the chain from the Start node, executing each connected node in sequence.  
**Stop** — interrupts a running chain. Nodes already in progress finish; pending nodes are cancelled.

Edges animate (travelling blue dashes) while their source node is running. The title bar shows the name of the currently active node.

---

## Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| `V` | Pointer / select mode |
| `C` | Connect mode (draw edges) |
| `Escape` | Return to pointer mode |
| `Backspace` / `Delete` | Delete selected node |
| `Ctrl/Cmd + Z` | Undo last action (place, move, connect) |
| `Ctrl/Cmd + =` / `+` | Zoom in |
| `Ctrl/Cmd + -` | Zoom out |
| `Ctrl/Cmd + 0` | Reset zoom to 100% |
| Scroll | Pan canvas |
| Ctrl/Cmd + Scroll | Zoom canvas |
