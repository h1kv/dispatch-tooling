import { useEffect, useRef, useState } from "react";
import type { BoardUser, EdgeV2, NodeV2, NodeStatus } from "../../types/index.js";

function getSocketUrl(): string {
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  return `${protocol}//${window.location.host}/ws`;
}

function sendJson(socketRef: React.MutableRefObject<WebSocket | null>, message: unknown): void {
  if (socketRef.current?.readyState === WebSocket.OPEN) {
    socketRef.current.send(JSON.stringify(message));
  }
}

export interface UseSocketResult {
  status: string;
  users: Map<string, BoardUser>;
  nodesRef: React.MutableRefObject<Map<string, NodeV2>>;
  edgesRef: React.MutableRefObject<Map<string, EdgeV2>>;
  selfIdRef: React.MutableRefObject<string | null>;
  socketRef: React.MutableRefObject<WebSocket | null>;
  graphVersion: number;
  chainRunning: boolean;
  sendWs: (msg: unknown) => void;
  planElements: string;
  sendPlanUpdate: (elements: string) => void;
}

export function useSocket(username: string): UseSocketResult {
  const socketRef = useRef<WebSocket | null>(null);
  const selfIdRef = useRef<string | null>(null);
  const nodesRef = useRef<Map<string, NodeV2>>(new Map());
  const edgesRef = useRef<Map<string, EdgeV2>>(new Map());
  const usersRef = useRef<Map<string, BoardUser>>(new Map());

  const [status, setStatus] = useState("connecting");
  const [users, setUsers] = useState<Map<string, BoardUser>>(new Map());
  const [graphVersion, setGraphVersion] = useState(0);
  const [planElements, setPlanElements] = useState("[]");
  const [chainRunning, setChainRunning] = useState(false);

  function bumpGraph() { setGraphVersion((v) => v + 1); }

  useEffect(() => {
    const socket = new WebSocket(getSocketUrl());
    socketRef.current = socket;
    setStatus("connecting");

    socket.addEventListener("open", () => {
      setStatus("connected");
      sendJson(socketRef, { type: "join", name: username });
    });

    socket.addEventListener("message", (event: MessageEvent) => {
      let message: Record<string, unknown>;
      try {
        message = JSON.parse(event.data as string) as Record<string, unknown>;
      } catch {
        return;
      }

      switch (message.type) {
        case "init": {
          selfIdRef.current = message.selfId as string;
          usersRef.current = new Map(((message.users as BoardUser[]) || []).map((u) => [u.id, u]));
          nodesRef.current = new Map(((message.nodes as NodeV2[]) || []).map((n) => [n.id, n]));
          edgesRef.current = new Map(((message.edges as EdgeV2[]) || []).map((e) => [e.id, e]));
          setPlanElements(typeof message.planElements === "string" ? message.planElements : "[]");
          setUsers(new Map(usersRef.current));
          bumpGraph();
          return;
        }

        case "user:joined": {
          const user = message.user as BoardUser;
          usersRef.current.set(user.id, user);
          setUsers(new Map(usersRef.current));
          return;
        }

        case "user:left": {
          usersRef.current.delete(message.userId as string);
          setUsers(new Map(usersRef.current));
          bumpGraph();
          return;
        }

        case "cursor:update": {
          const user = usersRef.current.get(message.userId as string);
          if (!user) return;
          usersRef.current.set(message.userId as string, {
            ...user,
            cursor: message.point as { x: number; y: number },
            cursorWorkspace: message.workspaceTab === "plan" ? "plan" : "canvas",
          });
          setUsers(new Map(usersRef.current));
          bumpGraph();
          return;
        }

        case "node:created":
        case "node:updated": {
          const node = message.node as NodeV2;
          nodesRef.current.set(node.id, node);
          bumpGraph();
          return;
        }

        case "node:status": {
          const nodeId = message.nodeId as string;
          const existing = nodesRef.current.get(nodeId);
          if (existing) {
            nodesRef.current.set(nodeId, {
              ...existing,
              status: message.status as NodeStatus,
              output: message.output as string | null,
            });
            bumpGraph();
          }
          return;
        }

        case "node:deleted": {
          nodesRef.current.delete(message.nodeId as string);
          bumpGraph();
          return;
        }

        case "edge:created": {
          const edge = message.edge as EdgeV2;
          edgesRef.current.set(edge.id, edge);
          bumpGraph();
          return;
        }

        case "edge:deleted": {
          edgesRef.current.delete(message.edgeId as string);
          bumpGraph();
          return;
        }

        case "chain:started": {
          setChainRunning(true);
          return;
        }

        case "chain:complete":
        case "chain:stopped":
        case "chain:error": {
          setChainRunning(false);
          return;
        }

        case "plan:updated": {
          setPlanElements(typeof message.elements === "string" ? message.elements : "[]");
          return;
        }

        case "chat:response":
        case "chat:error": {
          window.dispatchEvent(new CustomEvent("dispatch:chat", { detail: message }));
          return;
        }
      }
    });

    socket.addEventListener("close", () => setStatus("disconnected"));
    socket.addEventListener("error", () => setStatus("disconnected"));

    return () => {
      socket.close();
      socketRef.current = null;
    };
  }, [username]);

  return {
    status,
    users,
    nodesRef,
    edgesRef,
    selfIdRef,
    socketRef,
    graphVersion,
    chainRunning,
    sendWs: (msg: unknown) => sendJson(socketRef, msg),
    planElements,
    sendPlanUpdate: (elements: string) => sendJson(socketRef, { type: "plan:update", elements }),
  };
}
