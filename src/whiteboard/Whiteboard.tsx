import { useRef, useState, useMemo } from "react";
import { useSocket } from "./hooks/useSocket.js";
import { useRender } from "./hooks/useRender.js";
import { useInteraction } from "./hooks/useInteraction.js";
import { TitleBar } from "./components/TitleBar.js";
import { ActivityBar } from "./components/ActivityBar.js";
import { Canvas } from "./components/Canvas.js";
import { Sidebar } from "./components/Sidebar.js";
import type { View, InteractionState, BoardNode } from "../types/index.js";

interface WhiteboardProps {
  username: string;
}

export function Whiteboard({ username }: WhiteboardProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const viewRef = useRef<View>({ x: 0, y: 0, scale: 1 });
  const interactionStateRef = useRef<InteractionState>({
    selectedNodeId: null,
    pendingConnectionSourceId: null,
    pendingConnectionSourcePort: null,
    placementPreview: null,
    hoverPortInfo: null,
    connectionDraftTarget: null,
  });

  const [sidebarTab, setSidebarTab] = useState<string | null>("toolbox");

  const { status, users, nodeTypes, nodesRef, edgesRef, selfIdRef, socketRef, graphVersion, chainRunning, sendWs } =
    useSocket(username);

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
    placementTypeId,
    selectedNodeId,
    pendingConnectionSourceId,
    selectedLabelDraft,
    zoomPercent,
    contextMenu,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    handleContextMenu,
    setBoardMode,
    updateSelectedNodeLabel,
    deleteSelectedNode,
    adjustZoom,
    resetZoom,
    setSelectedLabelDraft,
    closeContextMenu,
    connectFromNode,
  } = useInteraction({
    canvasRef,
    viewRef,
    nodesRef,
    edgesRef,
    socketRef,
    interactionStateRef,
    requestRender,
    nodeTypes,
  });

  function handleRun() { sendWs({ type: "chain:run" }); }
  function handleStop() { sendWs({ type: "chain:stop" }); }
  function handleApprove() {
    const paused = Array.from(nodesRef.current.values()).find((n) => n.status === "paused");
    if (paused) sendWs({ type: "review:approve", nodeId: paused.id });
  }
  function handleReject() {
    const paused = Array.from(nodesRef.current.values()).find((n) => n.status === "paused");
    if (paused) sendWs({ type: "review:reject", nodeId: paused.id });
  }
  function handleNodeConfigChange(nodeId: string, patch: Record<string, unknown>) {
    sendWs({ type: "node:config:update", nodeId, config: patch });
  }

  const pausedReviewNode = useMemo<BoardNode | null>(() => {
    for (const node of nodesRef.current.values()) {
      if (node.typeId === "review" && node.status === "paused") return node;
    }
    return null;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [graphVersion]);

  const runningNodeLabel = useMemo<string | null>(() => {
    if (!chainRunning) return null;
    for (const node of nodesRef.current.values()) {
      if (node.status === "running") return node.label || node.typeId;
    }
    return null;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chainRunning, graphVersion]);

  const chainNodes = useMemo<BoardNode[]>(() => {
    return Array.from(nodesRef.current.values());
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [graphVersion]);

  const selectedNode = selectedNodeId ? (nodesRef.current.get(selectedNodeId) ?? null) : null;
  const selectedTypeName = selectedNode
    ? (nodeTypes.find((t) => t.id === selectedNode.typeId)?.label ?? selectedNode.typeId)
    : null;

  const modeLabel = useMemo(() => {
    if (mode === "connect") return pendingConnectionSourceId ? "Connector — pick target" : "Connector";
    if (mode === "place") {
      const t = nodeTypes.find((t) => t.id === placementTypeId);
      return t ? `Place · ${t.label}` : "Place";
    }
    return "Pointer";
  }, [mode, nodeTypes, pendingConnectionSourceId, placementTypeId]);

  const connectedUsers = Array.from(users.values());

  function handleTabChange(tab: string) {
    setSidebarTab((prev) => (prev === tab ? null : tab));
  }

  function handleLabelChange(label: string) {
    setSelectedLabelDraft(label);
    if (label) updateSelectedNodeLabel(label);
  }

  return (
    <div className="vsc-shell">
      <TitleBar status={status} userCount={connectedUsers.length} chainRunning={chainRunning} runningNodeLabel={runningNodeLabel} onRun={handleRun} onStop={handleStop} />

      <div className={`vsc-workspace${sidebarTab === null ? " sidebar-collapsed" : ""}`}>
        <Canvas
          canvasRef={canvasRef}
          mode={mode}
          modeLabel={modeLabel}
          zoomPercent={zoomPercent}
          nodeTypes={nodeTypes}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onContextMenu={handleContextMenu}
          onAdjustZoom={adjustZoom}
          onResetZoom={resetZoom}
          pausedReviewNode={pausedReviewNode}
          view={viewRef.current}
          onApprove={handleApprove}
          onReject={handleReject}
          contextMenu={contextMenu}
          onContextMenuClose={closeContextMenu}
          onContextMenuConnect={connectFromNode}
          onContextMenuDelete={(nodeId) => {
            sendWs({ type: "node:delete", nodeId });
            nodesRef.current.delete(nodeId);
            closeContextMenu();
          }}
        />

        <Sidebar
          sidebarTab={sidebarTab}
          mode={mode}
          nodeTypes={nodeTypes}
          placementTypeId={placementTypeId}
          pendingConnectionSourceId={pendingConnectionSourceId}
          selectedNode={selectedNode}
          selectedTypeName={selectedTypeName}
          selectedLabelDraft={selectedLabelDraft}
          onSetMode={setBoardMode}
          onLabelChange={handleLabelChange}
          onDeleteNode={deleteSelectedNode}
          onNodeConfigChange={handleNodeConfigChange}
          onApprove={handleApprove}
          onReject={handleReject}
          chainNodes={chainNodes}
          chainRunning={chainRunning}
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
        </div>
        <div className="vsc-statusbar-right">
          <span className="vsc-sitem">{nodesRef.current.size} nodes</span>
          <span className="vsc-ssep" />
          <span className="vsc-sitem">{connectedUsers.length} online</span>
          <span className="vsc-ssep" />
          <button type="button" className="vsc-sitem vsc-sitem-btn" onClick={() => adjustZoom(1.15)} aria-label="Zoom in">+</button>
          <button type="button" className="vsc-sitem vsc-sitem-btn" onClick={resetZoom} title="Reset zoom">{zoomPercent}%</button>
          <button type="button" className="vsc-sitem vsc-sitem-btn" onClick={() => adjustZoom(0.85)} aria-label="Zoom out">−</button>
        </div>
      </footer>
    </div>
  );
}
