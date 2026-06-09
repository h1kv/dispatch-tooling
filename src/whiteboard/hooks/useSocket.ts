import { useEffect, useRef, useState } from "react";
import { NODE_TYPES } from "../config/nodeTypes.js";
import type { BoardNode, BoardEdge, BoardUser, NodeTypeConfig, NodeStatus } from "../../types/index.js";

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
  nodeTypes: NodeTypeConfig[];
  nodesRef: React.MutableRefObject<Map<string, BoardNode>>;
  edgesRef: React.MutableRefObject<Map<string, BoardEdge>>;
  selfIdRef: React.MutableRefObject<string | null>;
  socketRef: React.MutableRefObject<WebSocket | null>;
  graphVersion: number;
  chainRunning: boolean;
  sendWs: (msg: unknown) => void;
}

export function useSocket(username: string): UseSocketResult {
  const socketRef = useRef<WebSocket | null>(null);
  const selfIdRef = useRef<string | null>(null);
  const nodesRef = useRef<Map<string, BoardNode>>(new Map());
  const edgesRef = useRef<Map<string, BoardEdge>>(new Map());
  const usersRef = useRef<Map<string, BoardUser>>(new Map());

  const [status, setStatus] = useState<string>("connecting");
  const [users, setUsers] = useState<Map<string, BoardUser>>(new Map());
  const [nodeTypes, setNodeTypes] = useState<NodeTypeConfig[]>(NODE_TYPES);
  const [graphVersion, setGraphVersion] = useState<number>(0);
  const [chainRunning, setChainRunning] = useState(false);

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

      if (message.type === "init") {
        selfIdRef.current = message.selfId as string;
        usersRef.current = new Map(
          ((message.users as BoardUser[]) || []).map((user) => [user.id, user])
        );
        nodesRef.current = new Map(
          ((message.nodes as BoardNode[]) || []).map((node) => [node.id, node])
        );
        edgesRef.current = new Map(
          ((message.edges as BoardEdge[]) || []).map((edge) => [edge.id, edge])
        );
        setUsers(new Map(usersRef.current));
        setNodeTypes((message.nodeTypes as NodeTypeConfig[]) || NODE_TYPES);
        setGraphVersion((v) => v + 1);
        return;
      }

      if (message.type === "user:joined") {
        const user = message.user as BoardUser;
        usersRef.current.set(user.id, user);
        setUsers(new Map(usersRef.current));
        return;
      }

      if (message.type === "user:left") {
        usersRef.current.delete(message.userId as string);
        setUsers(new Map(usersRef.current));
        return;
      }

      if (message.type === "cursor:update") {
        const user = usersRef.current.get(message.userId as string);
        if (!user) return;
        usersRef.current.set(message.userId as string, {
          ...user,
          cursor: message.point as { x: number; y: number },
        });
        setUsers(new Map(usersRef.current));
        return;
      }

      if (message.type === "node:created" || message.type === "node:updated") {
        const node = message.node as BoardNode;
        nodesRef.current.set(node.id, node);
        setGraphVersion((v) => v + 1);
        return;
      }

      if (message.type === "node:deleted") {
        nodesRef.current.delete(message.nodeId as string);
        for (const edgeId of (message.edgeIds as string[]) ?? []) {
          edgesRef.current.delete(edgeId);
        }
        setGraphVersion((v) => v + 1);
        return;
      }

      if (message.type === "edge:created") {
        const edge = message.edge as BoardEdge;
        edgesRef.current.set(edge.id, edge);
        setGraphVersion((v) => v + 1);
        return;
      }

      if (message.type === "edge:deleted") {
        edgesRef.current.delete(message.edgeId as string);
        setGraphVersion((v) => v + 1);
        return;
      }

      if (message.type === "node:status") {
        const nodeId = message.nodeId as string;
        const node = nodesRef.current.get(nodeId);
        if (node) {
          nodesRef.current.set(nodeId, {
            ...node,
            status: message.status as NodeStatus,
            output: (message.output as string | null) ?? node.output,
          });
          setGraphVersion((v) => v + 1);
        }
        return;
      }

      if (message.type === "node:output") {
        const nodeId = message.nodeId as string;
        const node = nodesRef.current.get(nodeId);
        if (node) {
          nodesRef.current.set(nodeId, { ...node, output: message.output as string });
          setGraphVersion((v) => v + 1);
        }
        return;
      }

      if (message.type === "node:config:updated") {
        const node = message.node as BoardNode;
        nodesRef.current.set(node.id, node);
        setGraphVersion((v) => v + 1);
        return;
      }

      if (message.type === "chain:started") {
        setChainRunning(true);
        return;
      }

      if (message.type === "chain:complete" || message.type === "chain:stopped") {
        setChainRunning(false);
        return;
      }

      if (message.type === "chain:error") {
        setChainRunning(false);
        console.error("Chain error:", message.message);
        return;
      }

      // Chat messages — forwarded via CustomEvent so ChatPanel can listen
      // without needing its own socket reference timing dependency
      if (message.type === "chat:response" || message.type === "chat:error") {
        window.dispatchEvent(new CustomEvent("canvax:chat", { detail: message }));
        return;
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
    nodeTypes,
    nodesRef,
    edgesRef,
    selfIdRef,
    socketRef,
    graphVersion,
    chainRunning,
    sendWs: (msg: unknown) => sendJson(socketRef, msg),
  };
}
