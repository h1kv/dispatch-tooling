import type { NodeV2, WorkspaceTab } from "../../types/index.js";
import { NODE_REGISTRY } from "../../../shared/nodeRegistry.js";
import { ChatPanel } from "./ChatPanel.js";

interface SidebarProps {
  workspaceTab: WorkspaceTab;
  sidebarTab: string | null;
  mode: string;
  selectedNode: NodeV2 | null;
  selectedTitleDraft: string;
  hasInitialiser: boolean;
  onSetMode: (mode: "select" | "place") => void;
  onTitleChange: (title: string) => void;
  onDeleteNode: () => void;
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

export function Sidebar({
  workspaceTab,
  sidebarTab,
  mode,
  selectedNode,
  selectedTitleDraft,
  hasInitialiser,
  onSetMode,
  onTitleChange,
  onDeleteNode,
  socketRef,
}: SidebarProps) {
  const isChat = sidebarTab === "chat";
  const isToolbox = sidebarTab === "toolbox";
  const initialiserAccent = NODE_REGISTRY.initialiser.accent;

  return (
    <aside className={`vsc-sidebar${isChat ? " vsc-sidebar--chat" : ""}`} aria-hidden={sidebarTab === null}>
      {isChat && (
        <ChatPanel socketRef={socketRef} workspaceTab={workspaceTab} />
      )}

      {isToolbox && workspaceTab === "canvas" && (
        <>
          <h2 className="vsc-sidebar-title">Canvas</h2>

          <section>
            <div className="vsc-section-hdr">Nodes</div>
            <div className="vsc-list">
              <button
                type="button"
                className={`vsc-list-item${mode === "place" ? " active" : ""}`}
                onClick={() => onSetMode(mode === "place" ? "select" : "place")}
                disabled={hasInitialiser && mode !== "place"}
                title={hasInitialiser ? "Only one Initialiser is allowed" : "Place Initialiser"}
              >
                <span className="vsc-list-icon" aria-hidden="true">
                  <span
                    className="vsc-glyph shape-terminator"
                    style={{ borderColor: initialiserAccent, background: "#e8f5ef" }}
                  />
                </span>
                <span className="vsc-list-label">Initialiser</span>
                <span className="vsc-list-badge">{hasInitialiser ? "Added" : "V2"}</span>
              </button>
            </div>
          </section>

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
                <span className="vsc-prop-val">initialiser</span>
              </div>
              <div className="vsc-prop-row">
                <span className="vsc-prop-key">Position</span>
                <span className="vsc-prop-val">{Math.round(selectedNode.x)}, {Math.round(selectedNode.y)}</span>
              </div>
              <button type="button" className="vsc-prop-delete" onClick={onDeleteNode}>
                Delete node
              </button>
            </section>
          ) : (
            <SidebarPlaceholder
              title="No node selected"
              body="Select the Initialiser to rename, move, or delete it."
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
