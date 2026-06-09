import { useCallback, useEffect, useRef } from "react";
import { renderBoard } from "../render.js";
import type { BoardUser, InteractionState, NodeV2, View } from "../../types/index.js";

export interface UseRenderParams {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  viewRef: React.MutableRefObject<View>;
  nodesRef: React.MutableRefObject<Map<string, NodeV2>>;
  usersRef: React.MutableRefObject<Map<string, BoardUser>>;
  selfIdRef: React.MutableRefObject<string | null>;
  interactionStateRef: React.MutableRefObject<InteractionState>;
  graphVersion: number;
}

export function useRender(params: UseRenderParams): { requestRender: () => void } {
  const { canvasRef, viewRef, nodesRef, usersRef, selfIdRef, interactionStateRef, graphVersion } = params;
  const rafRef = useRef<number | null>(null);

  const requestRender = useCallback(() => {
    if (rafRef.current) return;

    rafRef.current = window.requestAnimationFrame(() => {
      rafRef.current = null;
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext("2d");
      if (!canvas || !ctx) return;
      renderBoard(
        ctx,
        canvas,
        viewRef.current,
        usersRef.current,
        selfIdRef.current,
        { nodes: nodesRef.current },
        interactionStateRef.current
      );
    });
  }, [canvasRef, viewRef, nodesRef, usersRef, selfIdRef, interactionStateRef]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;

    function updateCanvasSize() {
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = Math.max(1, Math.floor(rect.width * dpr));
      canvas.height = Math.max(1, Math.floor(rect.height * dpr));
      requestRender();
    }

    const resizeObserver = new ResizeObserver(updateCanvasSize);
    resizeObserver.observe(canvas);
    updateCanvasSize();
    return () => resizeObserver.disconnect();
  }, [canvasRef, requestRender]);

  useEffect(() => {
    requestRender();
  }, [graphVersion, requestRender]);

  return { requestRender };
}
