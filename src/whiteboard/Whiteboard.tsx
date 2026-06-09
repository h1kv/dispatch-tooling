import { useEffect, useMemo, useRef, useState } from "react";
import { useSocket } from "./hooks/useSocket.js";
import { useRender } from "./hooks/useRender.js";
import { useInteraction } from "./hooks/useInteraction.js";
import { TitleBar } from "./components/TitleBar.js";
import { ActivityBar } from "./components/ActivityBar.js";
import { Canvas } from "./components/Canvas.js";
import { PlanCanvas } from "./components/PlanCanvas.js";
import { Sidebar } from "./components/Sidebar.js";
import type { InteractionState, NodeV2Type, View, WorkspaceTab } from "../types/index.js";

interface WhiteboardProps {
  username: string;
}

export function Whiteboard({ username }: WhiteboardProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const viewRef = useRef<View>({ x: 0, y: 0, scale: 1 });
  const interactionStateRef = useRef<InteractionState>({
    selectedNodeId: null,
    placementPreview: null,
    pendingConnectionSourceId: null,
    pendingConnectionKind: null,
    connectionDraftTarget: null,
  });

  const [sidebarTab, setSidebarTab] = useState<string | null>("toolbox");
  const [workspaceTab, setWorkspaceTab] = useState<WorkspaceTab>("canvas");

  const {
    status,
    users,
    nodesRef,
    edgesRef,
    selfIdRef,
    socketRef,
    graphVersion,
    chainRunning,
    sendWs,
    planElements,
    sendPlanUpdate,
  } = useSocket(username);

  const usersRef = useRef(users);
  usersRef.current = users;

  const { requestRender } = useRender({
    canvasRef,
    viewRef,
    nodesRef,
    edgesRef,
    usersRef,
    selfIdRef,
    interactionStateRef,
    graphVersion,
  });

  const {
    mode,
    placingType,
    selectedNodeId,
    selectedTitleDraft,
    zoomPercent,
    contextMenu,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    handleContextMenu,
    setBoardMode,
    updateSelectedNodeTitle,
    updateSelectedNodeConfig,
    deleteSelectedNode,
    adjustZoom,
    resetZoom,
    setSelectedTitleDraft,
    closeContextMenu,
  } = useInteraction({
    enabled: workspaceTab === "canvas",
    canvasRef,
    viewRef,
    nodesRef,
    edgesRef,
    socketRef,
    interactionStateRef,
    requestRender,
  });

  const selectedNode = selectedNodeId ? (nodesRef.current.get(selectedNodeId) ?? null) : null;
  const hasInitialiser = Array.from(nodesRef.current.values()).some((n) => n.type === "initialiser");

  const modeLabel = useMemo(() => {
    if (mode === "place" && placingType) return `Place · ${placingType.charAt(0).toUpperCase() + placingType.slice(1)}`;
    if (mode === "place") return "Place · Node";
    return "Pointer";
  }, [mode, placingType]);

  const connectedUsers = Array.from(users.values());

  useEffect(() => {
    if (workspaceTab !== "canvas") return undefined;
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    const frame = window.requestAnimationFrame(() => {
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = Math.max(1, Math.floor(rect.width * dpr));
      canvas.height = Math.max(1, Math.floor(rect.height * dpr));
      requestRender();
    });
    return () => window.cancelAnimationFrame(frame);
  }, [requestRender, workspaceTab]);

  function handleTabChange(tab: string) {
    setSidebarTab((prev) => (prev === tab ? null : tab));
  }

  function handleTitleChange(title: string) {
    setSelectedTitleDraft(title);
    updateSelectedNodeTitle(title);
  }

  function deleteNodeById(nodeId: string) {
    sendWs({ type: "node:delete", nodeId });
    nodesRef.current.delete(nodeId);
    for (const [edgeId, edge] of edgesRef.current) {
      if (edge.sourceId === nodeId || edge.targetId === nodeId) {
        edgesRef.current.delete(edgeId);
      }
    }
    if (interactionStateRef.current.selectedNodeId === nodeId) {
      interactionStateRef.current.selectedNodeId = null;
    }
    requestRender();
    closeContextMenu();
  }

  function handleRunChain() {
    sendWs({ type: "chain:run" });
  }

  function handleStopChain() {
    sendWs({ type: "chain:stop" });
  }

  function handlePlaceNode(type: NodeV2Type) {
    setBoardMode("place", type);
  }

  return (
    <div className="vsc-shell">
      {status === "connecting" && (
        <div className="dispatch-loading" aria-live="polite" aria-label="Connecting to DISPATCH.AI">
          <div className="dispatch-loading-text">DISPATCH.AI</div>
        </div>
      )}
      <TitleBar
        status={status}
        userCount={connectedUsers.length}
        workspaceTab={workspaceTab}
        onWorkspaceTabChange={setWorkspaceTab}
      />

      <div className={`vsc-workspace${sidebarTab === null ? " sidebar-collapsed" : ""}`}>
        <div className="vsc-surface-stack">
          <section
            id="canvas-panel"
            role="tabpanel"
            hidden={workspaceTab !== "canvas"}
            className="vsc-surface-panel"
          >
            <Canvas
              canvasRef={canvasRef}
              mode={mode}
              modeLabel={modeLabel}
              zoomPercent={zoomPercent}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onContextMenu={handleContextMenu}
              onAdjustZoom={adjustZoom}
              onResetZoom={resetZoom}
              contextMenu={contextMenu}
              onContextMenuClose={closeContextMenu}
              onContextMenuDelete={deleteNodeById}
            />
          </section>
          <section
            id="plan-panel"
            role="tabpanel"
            hidden={workspaceTab !== "plan"}
            className="vsc-surface-panel"
          >
            <PlanCanvas
              elements={planElements}
              onUpdate={sendPlanUpdate}
            />
          </section>
        </div>

        <Sidebar
          workspaceTab={workspaceTab}
          sidebarTab={sidebarTab}
          mode={mode}
          placingType={placingType}
          selectedNode={selectedNode}
          selectedTitleDraft={selectedTitleDraft}
          hasInitialiser={hasInitialiser}
          chainRunning={chainRunning}
          onSetMode={setBoardMode}
          onPlaceNode={handlePlaceNode}
          onTitleChange={handleTitleChange}
          onConfigChange={updateSelectedNodeConfig}
          onDeleteNode={deleteSelectedNode}
          onRunChain={handleRunChain}
          onStopChain={handleStopChain}
          socketRef={socketRef}
        />

        <ActivityBar sidebarTab={sidebarTab} onTabChange={handleTabChange} />
      </div>

      <footer className="vsc-statusbar">
        <div className="vsc-statusbar-left">
          <span className="vsc-sitem">
            <span className={`vsc-status-pill ${status}`} />
            {status}
          </span>
          <span className="vsc-ssep" />
          <span className="vsc-sitem">{modeLabel}</span>
          {chainRunning && (
            <>
              <span className="vsc-ssep" />
              <span className="vsc-sitem" style={{ color: "#e6a817" }}>Chain running…</span>
            </>
          )}
        </div>
        <div className="vsc-statusbar-right">
          <span className="vsc-sitem">
            {nodesRef.current.size} {nodesRef.current.size === 1 ? "node" : "nodes"}
          </span>
          <span className="vsc-ssep" />
          <span className="vsc-sitem">{connectedUsers.length} online</span>
          <span className="vsc-ssep" />
          <button type="button" className="vsc-sitem vsc-sitem-btn" onClick={() => adjustZoom(1.15)} aria-label="Zoom in">+</button>
          <button type="button" className="vsc-sitem vsc-sitem-btn" onClick={() => resetZoom()} title="Reset zoom">
            {zoomPercent}%
          </button>
          <button type="button" className="vsc-sitem vsc-sitem-btn" onClick={() => adjustZoom(0.85)} aria-label="Zoom out">−</button>
        </div>
      </footer>
    </div>
  );
}
