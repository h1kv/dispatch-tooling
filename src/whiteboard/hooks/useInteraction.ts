import { useCallback, useEffect, useRef, useState } from "react";
import { GRID_SIZE, INITIALISER_NODE_TYPE, NODE_REGISTRY } from "../../../shared/nodeRegistry.js";
import { clamp, distance, findNodeAtPoint, screenToWorld, snapToGrid } from "../geometry.js";
import type { InteractionState, NodeV2, Point, View } from "../../types/index.js";

function getCanvasPoint(canvas: HTMLCanvasElement, event: { clientX: number; clientY: number }): Point {
  const rect = canvas.getBoundingClientRect();
  return {
    x: event.clientX - rect.left,
    y: event.clientY - rect.top,
  };
}

function getPointerPair(pointers: Map<number, Point>): [Point, Point] | null {
  const values = Array.from(pointers.values());
  return values.length >= 2 ? [values[0], values[1]] : null;
}

function getMidpoint(a: Point, b: Point): Point {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

function sendJson(socketRef: React.MutableRefObject<WebSocket | null>, message: unknown): void {
  if (socketRef.current?.readyState === WebSocket.OPEN) {
    socketRef.current.send(JSON.stringify(message));
  }
}

function createClientId(prefix: string): string {
  if (window.crypto?.randomUUID) return `${prefix}_${window.crypto.randomUUID()}`;
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

export interface ContextMenuState {
  screenX: number;
  screenY: number;
  nodeId: string | null;
}

export interface UseInteractionParams {
  enabled?: boolean;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  viewRef: React.MutableRefObject<View>;
  nodesRef: React.MutableRefObject<Map<string, NodeV2>>;
  socketRef: React.MutableRefObject<WebSocket | null>;
  interactionStateRef: React.MutableRefObject<InteractionState>;
  requestRender: () => void;
}

export interface UseInteractionResult {
  mode: string;
  selectedNodeId: string | null;
  selectedTitleDraft: string;
  zoomPercent: number;
  contextMenu: ContextMenuState | null;
  handlePointerDown: (event: React.PointerEvent<HTMLCanvasElement>) => void;
  handlePointerMove: (event: React.PointerEvent<HTMLCanvasElement>) => void;
  handlePointerUp: (event: React.PointerEvent<HTMLCanvasElement>) => void;
  handleContextMenu: (event: React.MouseEvent<HTMLCanvasElement>) => void;
  setBoardMode: (mode: string) => void;
  createInitialiserAtCenter: () => void;
  updateSelectedNodeTitle: (title: string) => void;
  deleteSelectedNode: () => void;
  adjustZoom: (factor: number) => void;
  resetZoom: () => void;
  setSelectedTitleDraft: React.Dispatch<React.SetStateAction<string>>;
  closeContextMenu: () => void;
}

export function useInteraction(params: UseInteractionParams): UseInteractionResult {
  const {
    enabled = true,
    canvasRef,
    viewRef,
    nodesRef,
    socketRef,
    interactionStateRef,
    requestRender,
  } = params;

  const [mode, setMode] = useState("select");
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedTitleDraft, setSelectedTitleDraft] = useState("");
  const [zoomPercent, setZoomPercent] = useState(100);
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);

  const pointersRef = useRef<Map<number, Point>>(new Map());
  const panRef = useRef<{ pointerId: number; lastPoint: Point } | null>(null);
  const pinchRef = useRef<{ distance: number; startScale: number; worldMidpoint: Point } | null>(null);
  const gestureRef = useRef<{ startScale: number; worldPoint: Point } | null>(null);
  const nodeDragRef = useRef<{ nodeId: string; offset: Point } | null>(null);
  const lastCursorSentRef = useRef(0);

  const modeRef = useRef(mode);
  useEffect(() => { modeRef.current = mode; }, [mode]);

  useEffect(() => {
    const node = selectedNodeId ? nodesRef.current.get(selectedNodeId) : null;
    setSelectedTitleDraft(node?.title ?? "");
    interactionStateRef.current = { ...interactionStateRef.current, selectedNodeId };
    requestRender();
  }, [selectedNodeId, nodesRef, interactionStateRef, requestRender]);

  function closeContextMenu() { setContextMenu(null); }

  function hasInitialiser(): boolean {
    return Array.from(nodesRef.current.values()).some((node) => node.type === INITIALISER_NODE_TYPE);
  }

  const applyView = useCallback((nextView: View) => {
    viewRef.current = nextView;
    setZoomPercent(Math.round(nextView.scale * 100));
    requestRender();
  }, [viewRef, requestRender]);

  function sendCursor(point: Point) {
    const now = performance.now();
    if (now - lastCursorSentRef.current < 40) return;
    lastCursorSentRef.current = now;
    sendJson(socketRef, { type: "cursor:update", point, workspaceTab: "canvas" });
  }

  function createInitialiser(position: Point): void {
    if (hasInitialiser()) return;
    const definition = NODE_REGISTRY.initialiser;
    const nodeId = createClientId("node");
    const snapped = snapToGrid({
      x: position.x - definition.width / 2,
      y: position.y - definition.height / 2,
    }, GRID_SIZE);
    const now = Date.now();
    const node: NodeV2 = {
      id: nodeId,
      type: INITIALISER_NODE_TYPE,
      title: definition.defaultTitle,
      x: snapped.x,
      y: snapped.y,
      width: definition.width,
      height: definition.height,
      createdBy: "local",
      createdAt: now,
      updatedAt: now,
    };
    nodesRef.current.set(node.id, node);
    setSelectedNodeId(node.id);
    setMode("select");
    interactionStateRef.current = { ...interactionStateRef.current, placementPreview: null };
    requestRender();
    sendJson(socketRef, {
      type: "node:create",
      nodeId,
      nodeType: INITIALISER_NODE_TYPE,
      position: snapped,
      title: definition.defaultTitle,
    });
  }

  function createInitialiserAtCenter(): void {
    const canvas = canvasRef.current;
    if (!canvas) return;
    createInitialiser(screenToWorld({ x: canvas.clientWidth / 2, y: canvas.clientHeight / 2 }, viewRef.current));
  }

  function updateSelectedNodeTitle(title: string): void {
    if (!selectedNodeId) return;
    const node = nodesRef.current.get(selectedNodeId);
    if (!node) return;
    const next = { ...node, title, updatedAt: Date.now() };
    nodesRef.current.set(node.id, next);
    setSelectedTitleDraft(title);
    requestRender();
    sendJson(socketRef, { type: "node:update", nodeId: node.id, title });
  }

  function deleteSelectedNode(): void {
    if (!selectedNodeId) return;
    nodesRef.current.delete(selectedNodeId);
    sendJson(socketRef, { type: "node:delete", nodeId: selectedNodeId });
    setSelectedNodeId(null);
    requestRender();
  }

  function moveNode(worldPoint: Point): void {
    const dragging = nodeDragRef.current;
    if (!dragging) return;
    const node = nodesRef.current.get(dragging.nodeId);
    if (!node) return;
    const position = snapToGrid({
      x: worldPoint.x - dragging.offset.x,
      y: worldPoint.y - dragging.offset.y,
    }, GRID_SIZE);
    nodesRef.current.set(node.id, { ...node, x: position.x, y: position.y, updatedAt: Date.now() });
    requestRender();
    sendJson(socketRef, { type: "node:update", nodeId: node.id, position });
  }

  function adjustZoom(multiplier: number): void {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const screenPoint = { x: canvas.clientWidth / 2, y: canvas.clientHeight / 2 };
    const worldPoint = screenToWorld(screenPoint, viewRef.current);
    const nextScale = clamp(viewRef.current.scale * multiplier, 0.25, 4);
    applyView({
      x: screenPoint.x - worldPoint.x * nextScale,
      y: screenPoint.y - worldPoint.y * nextScale,
      scale: nextScale,
    });
  }

  function resetZoom(): void {
    applyView({ ...viewRef.current, scale: 1 });
  }

  function beginPinch(): void {
    const pair = getPointerPair(pointersRef.current);
    if (!pair) return;
    const [first, second] = pair;
    const midpoint = getMidpoint(first, second);
    pinchRef.current = {
      distance: Math.max(distance(first, second), 1),
      startScale: viewRef.current.scale,
      worldMidpoint: screenToWorld(midpoint, viewRef.current),
    };
  }

  function updatePinch(): void {
    const pair = getPointerPair(pointersRef.current);
    const pinch = pinchRef.current;
    if (!pair || !pinch) return;
    const [first, second] = pair;
    const midpoint = getMidpoint(first, second);
    const nextScale = clamp((pinch.startScale * distance(first, second)) / pinch.distance, 0.25, 4);
    applyView({
      x: midpoint.x - pinch.worldMidpoint.x * nextScale,
      y: midpoint.y - pinch.worldMidpoint.y * nextScale,
      scale: nextScale,
    });
  }

  function setBoardMode(nextMode: string): void {
    if (nextMode === "place" && hasInitialiser()) return;
    setMode(nextMode);
    if (nextMode !== "place") {
      interactionStateRef.current = { ...interactionStateRef.current, placementPreview: null };
      requestRender();
    }
  }

  function handleContextMenu(event: React.MouseEvent<HTMLCanvasElement>): void {
    if (!enabled) return;
    event.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const screenPoint = getCanvasPoint(canvas, event);
    const worldPoint = screenToWorld(screenPoint, viewRef.current);
    const hitNode = findNodeAtPoint(worldPoint, nodesRef.current);
    if (hitNode) setSelectedNodeId(hitNode.id);
    setContextMenu({ screenX: screenPoint.x, screenY: screenPoint.y, nodeId: hitNode?.id ?? null });
  }

  function handlePointerDown(event: React.PointerEvent<HTMLCanvasElement>): void {
    if (!enabled || event.button !== 0) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    setContextMenu(null);

    const screenPoint = getCanvasPoint(canvas, event);
    const worldPoint = screenToWorld(screenPoint, viewRef.current);
    const hitNode = findNodeAtPoint(worldPoint, nodesRef.current);
    sendCursor(worldPoint);

    event.preventDefault();
    canvas.setPointerCapture(event.pointerId);
    pointersRef.current.set(event.pointerId, screenPoint);

    if (pointersRef.current.size >= 2) {
      panRef.current = null;
      nodeDragRef.current = null;
      beginPinch();
      return;
    }

    if (modeRef.current === "place" && !hitNode) {
      createInitialiser(worldPoint);
      return;
    }

    if (hitNode) {
      setSelectedNodeId(hitNode.id);
      nodeDragRef.current = {
        nodeId: hitNode.id,
        offset: { x: worldPoint.x - hitNode.x, y: worldPoint.y - hitNode.y },
      };
      return;
    }

    setSelectedNodeId(null);
    panRef.current = { pointerId: event.pointerId, lastPoint: screenPoint };
  }

  function handlePointerMove(event: React.PointerEvent<HTMLCanvasElement>): void {
    if (!enabled) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const screenPoint = getCanvasPoint(canvas, event);
    const worldPoint = screenToWorld(screenPoint, viewRef.current);

    if (modeRef.current === "place" && !hasInitialiser()) {
      const definition = NODE_REGISTRY.initialiser;
      interactionStateRef.current = {
        ...interactionStateRef.current,
        placementPreview: {
          type: INITIALISER_NODE_TYPE,
          ...snapToGrid({ x: worldPoint.x - definition.width / 2, y: worldPoint.y - definition.height / 2 }, GRID_SIZE),
        },
      };
    }

    if (!pointersRef.current.has(event.pointerId)) {
      if (event.pointerType === "mouse") sendCursor(worldPoint);
      requestRender();
      return;
    }

    event.preventDefault();
    pointersRef.current.set(event.pointerId, screenPoint);

    if (pinchRef.current && pointersRef.current.size >= 2) {
      updatePinch();
      return;
    }

    if (nodeDragRef.current) {
      moveNode(worldPoint);
      sendCursor(worldPoint);
      return;
    }

    if (panRef.current?.pointerId === event.pointerId) {
      const lastPoint = panRef.current.lastPoint;
      applyView({
        ...viewRef.current,
        x: viewRef.current.x + screenPoint.x - lastPoint.x,
        y: viewRef.current.y + screenPoint.y - lastPoint.y,
      });
      panRef.current.lastPoint = screenPoint;
    }

    sendCursor(worldPoint);
  }

  function handlePointerUp(event: React.PointerEvent<HTMLCanvasElement>): void {
    if (!enabled) return;
    if (panRef.current?.pointerId === event.pointerId) panRef.current = null;
    nodeDragRef.current = null;
    pointersRef.current.delete(event.pointerId);
    if (pointersRef.current.size < 2) pinchRef.current = null;
  }

  useEffect(() => {
    if (!enabled) return undefined;
    const canvas = canvasRef.current;
    if (!canvas) return undefined;

    function onWheel(event: WheelEvent) {
      event.preventDefault();
      const screenPoint = getCanvasPoint(canvas!, event);
      if (event.ctrlKey || event.metaKey) {
        const worldPoint = screenToWorld(screenPoint, viewRef.current);
        const nextScale = clamp(viewRef.current.scale * Math.exp(-event.deltaY * 0.002), 0.25, 4);
        applyView({
          x: screenPoint.x - worldPoint.x * nextScale,
          y: screenPoint.y - worldPoint.y * nextScale,
          scale: nextScale,
        });
        return;
      }
      applyView({
        ...viewRef.current,
        x: viewRef.current.x - event.deltaX,
        y: viewRef.current.y - event.deltaY,
      });
    }

    canvas.addEventListener("wheel", onWheel, { passive: false });
    return () => canvas.removeEventListener("wheel", onWheel);
  }, [applyView, canvasRef, enabled, viewRef]);

  useEffect(() => {
    if (!enabled) return undefined;
    const canvas = canvasRef.current;
    if (!canvas) return undefined;

    function handleGestureStart(event: Event) {
      event.preventDefault();
      const screenPoint = getCanvasPoint(canvas!, event as MouseEvent);
      gestureRef.current = {
        startScale: viewRef.current.scale,
        worldPoint: screenToWorld(screenPoint, viewRef.current),
      };
    }

    function handleGestureChange(event: Event) {
      event.preventDefault();
      const gesture = gestureRef.current;
      if (!gesture) return;
      const nativeEvent = event as Event & { scale?: number };
      const scale = typeof nativeEvent.scale === "number" ? nativeEvent.scale : 1;
      const screenPoint = getCanvasPoint(canvas!, event as MouseEvent);
      const nextScale = clamp(gesture.startScale * scale, 0.25, 4);
      applyView({
        x: screenPoint.x - gesture.worldPoint.x * nextScale,
        y: screenPoint.y - gesture.worldPoint.y * nextScale,
        scale: nextScale,
      });
    }

    function handleGestureEnd() {
      gestureRef.current = null;
    }

    canvas.addEventListener("gesturestart", handleGestureStart);
    canvas.addEventListener("gesturechange", handleGestureChange);
    canvas.addEventListener("gestureend", handleGestureEnd);
    return () => {
      canvas.removeEventListener("gesturestart", handleGestureStart);
      canvas.removeEventListener("gesturechange", handleGestureChange);
      canvas.removeEventListener("gestureend", handleGestureEnd);
    };
  }, [applyView, canvasRef, enabled, viewRef]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (!enabled) return;
      const target = event.target as HTMLElement | null;
      const editing = target?.tagName === "INPUT" || target?.tagName === "TEXTAREA" || target?.isContentEditable;
      if (editing) return;
      if (event.key === "Escape") {
        setMode("select");
        interactionStateRef.current = { ...interactionStateRef.current, placementPreview: null };
        requestRender();
      }
      if ((event.key === "Delete" || event.key === "Backspace") && selectedNodeId) deleteSelectedNode();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [enabled, selectedNodeId]);

  return {
    mode,
    selectedNodeId,
    selectedTitleDraft,
    zoomPercent,
    contextMenu,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    handleContextMenu,
    setBoardMode,
    createInitialiserAtCenter,
    updateSelectedNodeTitle,
    deleteSelectedNode,
    adjustZoom,
    resetZoom,
    setSelectedTitleDraft,
    closeContextMenu,
  };
}
