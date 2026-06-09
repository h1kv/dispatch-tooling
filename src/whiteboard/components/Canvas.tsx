import type { BoardNode, NodeTypeConfig, View } from "../../types/index.js";
import type { ContextMenuState } from "../hooks/useInteraction.js";

interface CanvasProps {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  mode: string;
  modeLabel: string;
  zoomPercent: number;
  nodeTypes: NodeTypeConfig[];
  onPointerDown: (e: React.PointerEvent<HTMLCanvasElement>) => void;
  onPointerMove: (e: React.PointerEvent<HTMLCanvasElement>) => void;
  onPointerUp: (e: React.PointerEvent<HTMLCanvasElement>) => void;
  onContextMenu: (e: React.MouseEvent<HTMLCanvasElement>) => void;
  onAdjustZoom: (factor: number) => void;
  onResetZoom: () => void;
  pausedReviewNode: BoardNode | null;
  view: View;
  onApprove: () => void;
  onReject: () => void;
  contextMenu: ContextMenuState | null;
  onContextMenuClose: () => void;
  onContextMenuConnect: (nodeId: string) => void;
  onContextMenuDelete: (nodeId: string) => void;
}

export function Canvas({
  canvasRef, mode, modeLabel, zoomPercent, nodeTypes,
  onPointerDown, onPointerMove, onPointerUp, onContextMenu,
  onAdjustZoom, onResetZoom,
  pausedReviewNode, view, onApprove, onReject,
  contextMenu, onContextMenuClose, onContextMenuConnect, onContextMenuDelete,
}: CanvasProps) {
  let overlayStyle: React.CSSProperties | null = null;
  if (pausedReviewNode) {
    const screenX = pausedReviewNode.x * view.scale + view.x + pausedReviewNode.width / 2 * view.scale;
    const screenY = (pausedReviewNode.y + pausedReviewNode.height) * view.scale + view.y + 18;
    overlayStyle = {
      position: "absolute",
      left: screenX,
      top: screenY,
      transform: "translateX(-50%)",
      display: "flex",
      gap: "8px",
      zIndex: 10,
      pointerEvents: "all",
    };
  }

  const ctxNodeType = contextMenu?.nodeId
    ? nodeTypes.find((t) => {
        // We need the node's typeId — Canvas doesn't have nodesRef, so we only show generic items
        return false;
      })
    : null;
  void ctxNodeType;

  return (
    <main className="vsc-editor">
      <canvas
        ref={canvasRef}
        className={`vsc-canvas mode-${mode}`}
        onContextMenu={onContextMenu}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      />

      {overlayStyle && (
        <div style={overlayStyle}>
          <button type="button" className="vsc-review-approve" onClick={onApprove}>
            ✓ Approve
          </button>
          <button type="button" className="vsc-review-reject" onClick={onReject}>
            ✕ Reject
          </button>
        </div>
      )}

      {contextMenu && (
        <>
          <div className="vsc-ctx-backdrop" onClick={onContextMenuClose} />
          <div
            className="vsc-ctx-menu"
            style={{ left: contextMenu.screenX, top: contextMenu.screenY }}
          >
            {contextMenu.nodeId ? (
              <>
                <button
                  type="button"
                  className="vsc-ctx-item"
                  onClick={() => onContextMenuConnect(contextMenu.nodeId!)}
                >
                  <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" aria-hidden="true">
                    <circle cx="3.5" cy="8" r="2"/>
                    <circle cx="12.5" cy="8" r="2"/>
                    <line x1="5.5" y1="8" x2="10.5" y2="8"/>
                    <polyline points="9,6.5 10.8,8 9,9.5" strokeLinejoin="round"/>
                  </svg>
                  Connect from here
                </button>
                <div className="vsc-ctx-sep" />
                <button
                  type="button"
                  className="vsc-ctx-item vsc-ctx-item--danger"
                  onClick={() => onContextMenuDelete(contextMenu.nodeId!)}
                >
                  <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden="true">
                    <polyline points="3,4 13,4"/>
                    <path d="M5 4V3a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v1"/>
                    <path d="M4 4l1 9h6l1-9"/>
                  </svg>
                  Delete node
                </button>
              </>
            ) : (
              <>
                <button type="button" className="vsc-ctx-item" onClick={() => { onContextMenuClose(); }}>
                  <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
                    <path d="M1.5 1L7 13.5l2.2-5.3L14.5 6z"/>
                  </svg>
                  Pointer mode
                </button>
                <button type="button" className="vsc-ctx-item" onClick={() => { onContextMenuClose(); }}>
                  <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" aria-hidden="true">
                    <circle cx="3.5" cy="8" r="2"/>
                    <circle cx="12.5" cy="8" r="2"/>
                    <line x1="5.5" y1="8" x2="10.5" y2="8"/>
                  </svg>
                  Connect mode
                </button>
              </>
            )}
          </div>
        </>
      )}

      <div className="vsc-hint" aria-hidden="true">
        <span className="vsc-hint-mode">{modeLabel}</span>
        <span className="vsc-hint-sep" />
        <span className="vsc-hint-zoom">{zoomPercent}%</span>
      </div>
      <div className="vsc-zoom" aria-label="Zoom controls">
        <button type="button" className="vsc-zoom-btn" aria-label="Zoom in" onClick={() => onAdjustZoom(1.15)}>+</button>
        <button type="button" className="vsc-zoom-btn" aria-label="Reset zoom" onClick={onResetZoom} title="Reset zoom">⟳</button>
        <button type="button" className="vsc-zoom-btn" aria-label="Zoom out" onClick={() => onAdjustZoom(0.85)}>−</button>
      </div>
    </main>
  );
}
