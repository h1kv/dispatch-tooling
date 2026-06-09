import assert from "node:assert/strict";
import { beforeEach, test } from "node:test";
import type { WebSocket } from "ws";
import { createNodeFromPayload, deleteNode, updateNode } from "../server/features/state/operations.js";
import {
  clients,
  nodes,
  resetWorkspaceForTests,
  setPlanExcalidrawData,
  users,
  workspaceStateSnapshot,
} from "../server/features/state/store.js";
import { handleChatMessage } from "../server/features/ws/handlers/chat.js";
import { handleJoin } from "../server/features/ws/handlers/join.js";
import { handleNodeCreate, handleNodeDelete, handleNodeUpdate } from "../server/features/ws/handlers/node.js";

class FakeSocket {
  OPEN = 1;
  readyState = 1;
  sent: unknown[] = [];

  send(payload: string): void {
    this.sent.push(JSON.parse(payload));
  }
}

function fakeWs(): WebSocket & FakeSocket {
  return new FakeSocket() as WebSocket & FakeSocket;
}

beforeEach(() => {
  resetWorkspaceForTests();
  clients.clear();
  users.clear();
});

test("Node V2 creates one Initialiser and rejects duplicates", () => {
  const first = createNodeFromPayload({
    type: "initialiser",
    position: { x: 10, y: 20 },
    title: "Start here",
    userId: "user_1",
  });
  assert.ok(first);
  assert.equal(first.type, "initialiser");
  assert.equal(first.title, "Start here");
  assert.equal(nodes.size, 1);

  const second = createNodeFromPayload({
    type: "initialiser",
    position: { x: 80, y: 120 },
    userId: "user_1",
  });
  assert.equal(second, null);
  assert.equal(nodes.size, 1);
});

test("Node V2 rejects unknown node types", () => {
  const node = createNodeFromPayload({
    type: "agent",
    position: { x: 0, y: 0 },
    userId: "user_1",
  });
  assert.equal(node, null);
  assert.equal(nodes.size, 0);
});

test("Node V2 updates title and position", () => {
  const node = createNodeFromPayload({
    type: "initialiser",
    position: { x: 0, y: 0 },
    userId: "user_1",
  });
  assert.ok(node);

  const updated = updateNode(node.id, {
    title: "Renamed",
    position: { x: 41, y: 67 },
  });
  assert.ok(updated);
  assert.equal(updated.title, "Renamed");
  assert.equal(updated.x, 32);
  assert.equal(updated.y, 64);
});

test("Node V2 can delete and recreate the Initialiser", () => {
  const node = createNodeFromPayload({
    type: "initialiser",
    position: { x: 0, y: 0 },
    userId: "user_1",
  });
  assert.ok(node);
  assert.equal(deleteNode(node.id), true);
  assert.equal(nodes.size, 0);

  const recreated = createNodeFromPayload({
    type: "initialiser",
    position: { x: 64, y: 64 },
    userId: "user_1",
  });
  assert.ok(recreated);
  assert.equal(nodes.size, 1);
});

test("workspace snapshot persists v2 nodes and plan elements", () => {
  createNodeFromPayload({
    type: "initialiser",
    position: { x: 0, y: 0 },
    userId: "user_1",
  });
  setPlanExcalidrawData('[{"id":"plan-1"}]');

  const snapshot = workspaceStateSnapshot();
  assert.equal(snapshot.version, 2);
  assert.equal(snapshot.nodes.length, 1);
  assert.equal(snapshot.planElements, '[{"id":"plan-1"}]');
});

test("init payload sends Node V2 workspace without legacy catalog or edges", () => {
  const ws = fakeWs();
  users.set("user_1", {
    id: "user_1",
    name: "Guest",
    color: "#000",
    cursor: null,
  });
  createNodeFromPayload({
    type: "initialiser",
    position: { x: 0, y: 0 },
    userId: "user_1",
  });
  setPlanExcalidrawData('[{"id":"plan-1"}]');

  handleJoin(ws, "user_1", { name: "Ada" }, "Guest");

  const init = ws.sent[0] as Record<string, unknown>;
  assert.equal(init.type, "init");
  assert.equal(Array.isArray(init.nodes), true);
  assert.equal(init.planElements, '[{"id":"plan-1"}]');
  assert.equal("edges" in init, false);
  assert.equal("nodeTypes" in init, false);
  assert.equal("planNodes" in init, false);
  assert.equal("planEdges" in init, false);
});

test("node websocket handlers broadcast Node V2 state", () => {
  const ws = fakeWs();
  clients.set(ws, "user_1");

  handleNodeCreate(ws, "user_1", {
    type: "node:create",
    nodeType: "initialiser",
    nodeId: "node_1",
    position: { x: 0, y: 0 },
    title: "Initialiser",
  });
  assert.equal((ws.sent[0] as Record<string, unknown>).type, "node:created");

  handleNodeUpdate(ws, "user_1", {
    type: "node:update",
    nodeId: "node_1",
    position: { x: 70, y: 70 },
    title: "Updated",
  });
  const updated = ws.sent[1] as Record<string, unknown>;
  assert.equal(updated.type, "node:updated");
  assert.equal((updated.node as Record<string, unknown>).title, "Updated");

  handleNodeDelete(ws, "user_1", { type: "node:delete", nodeId: "node_1" });
  assert.equal((ws.sent[2] as Record<string, unknown>).type, "node:deleted");
});

test("plain chat responds without workflow operations", async () => {
  const ws = fakeWs();

  await handleChatMessage(ws, "user_1", {
    type: "chat:message",
    content: "make a workflow",
  });

  const response = ws.sent[0] as Record<string, unknown>;
  assert.equal(response.type, "chat:response");
  assert.equal(response.responseMode, "done");
  assert.equal("operations" in response, false);
  assert.equal("planOperations" in response, false);
});
