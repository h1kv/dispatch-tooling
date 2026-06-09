import type { NodeV2, NodeV2Config, NodeV2Type, WorkspaceTab } from "../../types/index.js";
import { NODE_REGISTRY, SDLC_NODE_TYPES } from "../../../shared/nodeRegistry.js";
import { ChatPanel } from "./ChatPanel.js";

interface SidebarProps {
  workspaceTab: WorkspaceTab;
  sidebarTab: string | null;
  mode: string;
  placingType: NodeV2Type | null;
  selectedNode: NodeV2 | null;
  selectedTitleDraft: string;
  hasInitialiser: boolean;
  chainRunning: boolean;
  onSetMode: (mode: "select" | "place", nodeType?: NodeV2Type) => void;
  onPlaceNode: (type: NodeV2Type) => void;
  onTitleChange: (title: string) => void;
  onConfigChange: (config: Partial<NodeV2Config>) => void;
  onDeleteNode: () => void;
  onRunChain: () => void;
  onStopChain: () => void;
  socketRef: React.MutableRefObject<WebSocket | null>;
}

function SidebarPlaceholder({ title, body }: { title: string; body: string }) {
  return (
    <div className="vsc-chat-placeholder">
      <p>{title}</p>
      <p className="sub">{body}</p>
    </div>
  );
}

function NodeButton({
  type,
  isPlacing,
  onPlace,
}: {
  type: NodeV2Type;
  isPlacing: boolean;
  onPlace: (type: NodeV2Type) => void;
}) {
  const def = NODE_REGISTRY[type];
  return (
    <button
      type="button"
      className={`vsc-list-item${isPlacing ? " active" : ""}`}
      onClick={() => onPlace(type)}
      title={`Place ${def.label} node`}
    >
      <span className="vsc-list-icon" aria-hidden="true">
        <span
          className="vsc-glyph shape-terminator"
          style={{ borderColor: def.accent, background: `${def.accent}22` }}
        />
      </span>
      <span className="vsc-list-label">{def.label}</span>
      <span className="vsc-list-badge" style={{ color: def.accent }}>V2</span>
    </button>
  );
}

function ConfigEditor({
  node,
  onConfigChange,
}: {
  node: NodeV2;
  onConfigChange: (config: Partial<NodeV2Config>) => void;
}) {
  const def = NODE_REGISTRY[node.type];
  if (!def) return null;

  return (
    <>
      {node.type === "initialiser" && (
        <label className="vsc-prop-row vsc-prop-row--col">
          <span className="vsc-prop-key">Workspace Path</span>
          <input
            className="vsc-prop-input"
            type="text"
            value={node.config?.workspacePath ?? ""}
            onChange={(e) => onConfigChange({ workspacePath: e.target.value })}
            spellCheck={false}
            placeholder="./workspace"
          />
        </label>
      )}

      {node.type === "context" && (
        <label className="vsc-prop-row vsc-prop-row--col">
          <span className="vsc-prop-key">Context Content</span>
          <textarea
            className="vsc-prop-textarea"
            value={node.config?.content ?? ""}
            onChange={(e) => onConfigChange({ content: e.target.value })}
            spellCheck={false}
            placeholder="Enter context to inject into connected nodes…"
            rows={5}
          />
        </label>
      )}

      {SDLC_NODE_TYPES.includes(node.type as typeof SDLC_NODE_TYPES[number]) && (
        <label className="vsc-prop-row vsc-prop-row--col">
          <span className="vsc-prop-key">Task Prompt</span>
          <textarea
            className="vsc-prop-textarea"
            value={node.config?.taskPrompt ?? ""}
            onChange={(e) => onConfigChange({ taskPrompt: e.target.value })}
            spellCheck={false}
            placeholder={`What should the ${def.label} agent do in this run?`}
            rows={5}
          />
        </label>
      )}

      {node.status && node.status !== "idle" && (
        <div className="vsc-prop-row vsc-prop-row--col">
          <span className="vsc-prop-key">Status</span>
          <span
            className="vsc-prop-val"
            style={{
              color: node.status === "done" ? "#1a9e5a" : node.status === "error" ? "#d93f3f" : "#e6a817",
            }}
          >
            {node.status}
          </span>
        </div>
      )}

      {node.output && node.status === "error" && (
        <div className="vsc-prop-row vsc-prop-row--col">
          <span className="vsc-prop-key">Error</span>
          <span className="vsc-prop-val vsc-prop-val--error">{node.output}</span>
        </div>
      )}
    </>
  );
}

export function Sidebar({
  workspaceTab,
  sidebarTab,
  mode,
  placingType,
  selectedNode,
  selectedTitleDraft,
  hasInitialiser,
  chainRunning,
  onSetMode,
  onPlaceNode,
  onTitleChange,
  onConfigChange,
  onDeleteNode,
  onRunChain,
  onStopChain,
  socketRef,
}: SidebarProps) {
  const isChat = sidebarTab === "chat";
  const isToolbox = sidebarTab === "toolbox";

  function handlePlace(type: NodeV2Type) {
    if (mode === "place" && placingType === type) {
      onSetMode("select");
    } else {
      onPlaceNode(type);
    }
  }

  return (
    <aside className={`vsc-sidebar${isChat ? " vsc-sidebar--chat" : ""}`} aria-hidden={sidebarTab === null}>
      {isChat && (
        <ChatPanel socketRef={socketRef} workspaceTab={workspaceTab} />
      )}

      {isToolbox && workspaceTab === "canvas" && (
        <>
          <h2 className="vsc-sidebar-title">Canvas</h2>

          {/* Run / Stop chain */}
          <section>
            <div className="vsc-section-hdr">Chain</div>
            {chainRunning ? (
              <button
                type="button"
                className="vsc-list-item vsc-run-btn vsc-run-btn--stop"
                onClick={onStopChain}
              >
                <span className="vsc-list-label">Stop Chain</span>
              </button>
            ) : (
              <button
                type="button"
                className="vsc-list-item vsc-run-btn"
                onClick={onRunChain}
                disabled={!hasInitialiser}
                title={!hasInitialiser ? "Add an Initialiser node first" : "Run the node chain"}
              >
                <span className="vsc-list-label">Run Chain</span>
              </button>
            )}
          </section>

          {/* Infrastructure nodes */}
          <section>
            <div className="vsc-section-hdr">Infrastructure</div>
            <div className="vsc-list">
              <NodeButton
                type="initialiser"
                isPlacing={mode === "place" && placingType === "initialiser"}
                onPlace={handlePlace}
              />
              <NodeButton
                type="materialize"
                isPlacing={mode === "place" && placingType === "materialize"}
                onPlace={handlePlace}
              />
              <NodeButton
                type="context"
                isPlacing={mode === "place" && placingType === "context"}
                onPlace={handlePlace}
              />
            </div>
          </section>

          {/* SDLC nodes */}
          <section>
            <div className="vsc-section-hdr">SDLC</div>
            <div className="vsc-list">
              {SDLC_NODE_TYPES.map((type) => (
                <NodeButton
                  key={type}
                  type={type}
                  isPlacing={mode === "place" && placingType === type}
                  onPlace={handlePlace}
                />
              ))}
            </div>
          </section>

          {/* Pointer / select mode */}
          <section>
            <div className="vsc-section-hdr">Actions</div>
            <button
              type="button"
              className={`vsc-list-item${mode === "select" ? " active" : ""}`}
              onClick={() => onSetMode("select")}
            >
              <span className="vsc-list-icon" aria-hidden="true">
                <svg width="15" height="15" viewBox="0 0 16 16" fill="currentColor">
                  <path d="M1.5 1 7 13.5l2.1-5.2L14.5 6z" />
                </svg>
              </span>
              <span className="vsc-list-label">Pointer</span>
            </button>
          </section>

          {/* Properties panel */}
          {selectedNode ? (
            <section className="vsc-props">
              <div className="vsc-section-hdr">Properties</div>
              <label className="vsc-prop-row">
                <span className="vsc-prop-key">Title</span>
                <input
                  className="vsc-prop-input"
                  type="text"
                  value={selectedTitleDraft}
                  onChange={(e) => onTitleChange(e.target.value)}
                  spellCheck={false}
                />
              </label>
              <div className="vsc-prop-row">
                <span className="vsc-prop-key">Type</span>
                <span className="vsc-prop-val">{selectedNode.type}</span>
              </div>
              <div className="vsc-prop-row">
                <span className="vsc-prop-key">Position</span>
                <span className="vsc-prop-val">{Math.round(selectedNode.x)}, {Math.round(selectedNode.y)}</span>
              </div>
              <ConfigEditor node={selectedNode} onConfigChange={onConfigChange} />
              <button type="button" className="vsc-prop-delete" onClick={onDeleteNode}>
                Delete node
              </button>
            </section>
          ) : (
            <SidebarPlaceholder
              title="No node selected"
              body="Click a node to edit its properties."
            />
          )}
        </>
      )}

      {isToolbox && workspaceTab === "plan" && (
        <SidebarPlaceholder
          title="Plan"
          body="The Plan tab is a freeform Excalidraw workspace."
        />
      )}
    </aside>
  );
}
