import express from "express";
import { createServer } from "node:http";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { WebSocketServer } from "ws";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");
const isProduction = process.env.NODE_ENV === "production";
const port = Number(process.env.PORT || 3000);

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server, path: "/ws" });

const clients = new Map();
const strokes = new Map();
const users = new Map();

const userColors = ["#2d2d2d", "#7c3f3f", "#4f6b45", "#7a612e", "#6a4f76", "#7a4f5b"];
let colorIndex = 0;

function createId(prefix) {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

function safeText(value, fallback = "") {
  if (typeof value !== "string") return fallback;
  return value.trim().slice(0, 40) || fallback;
}

function safePoint(point) {
  if (!point || typeof point !== "object") return null;
  const x = Number(point.x);
  const y = Number(point.y);
  if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
  return { x, y };
}

function send(ws, message) {
  if (ws.readyState === ws.OPEN) {
    ws.send(JSON.stringify(message));
  }
}

function broadcast(message, exceptWs = null) {
  const encoded = JSON.stringify(message);
  for (const ws of clients.keys()) {
    if (ws !== exceptWs && ws.readyState === ws.OPEN) {
      ws.send(encoded);
    }
  }
}

function serializeUsers() {
  return Array.from(users.values());
}

function serializeStrokes() {
  return Array.from(strokes.values());
}

function eraseStrokes(ids) {
  const erasedIds = [];
  for (const id of ids) {
    if (typeof id === "string" && strokes.delete(id)) {
      erasedIds.push(id);
    }
  }
  return erasedIds;
}

wss.on("connection", (ws) => {
  const userId = createId("user");
  const fallbackName = `Guest ${users.size + 1}`;
  const user = {
    id: userId,
    name: fallbackName,
    color: userColors[colorIndex % userColors.length],
    cursor: null
  };

  colorIndex += 1;
  clients.set(ws, userId);
  users.set(userId, user);

  ws.on("message", (raw) => {
    let message;

    try {
      message = JSON.parse(raw.toString());
    } catch {
      return;
    }

    if (!message || typeof message.type !== "string") return;

    if (message.type === "join") {
      user.name = safeText(message.name, fallbackName);
      send(ws, {
        type: "init",
        selfId: userId,
        users: serializeUsers(),
        strokes: serializeStrokes()
      });
      broadcast({ type: "user:joined", user }, ws);
      return;
    }

    if (message.type === "cursor:update") {
      const point = safePoint(message.point);
      user.cursor = point;
      broadcast({ type: "cursor:update", userId, point }, ws);
      return;
    }

    if (message.type === "stroke:start") {
      const strokeId = safeText(message.stroke?.id, createId("stroke"));
      const point = safePoint(message.stroke?.point);
      if (!point) return;

      const stroke = {
        id: strokeId,
        userId,
        userName: user.name,
        color: safeText(message.stroke.color, "#1f1f1f"),
        size: Number(message.stroke.size) || 4,
        points: [point],
        createdAt: Date.now()
      };

      strokes.set(stroke.id, stroke);
      broadcast({ type: "stroke:start", stroke }, ws);
      return;
    }

    if (message.type === "stroke:point") {
      const strokeId = safeText(message.strokeId);
      const point = safePoint(message.point);
      const stroke = strokes.get(strokeId);
      if (!point || !stroke || stroke.userId !== userId) return;

      stroke.points.push(point);
      broadcast({ type: "stroke:point", strokeId, point }, ws);
      return;
    }

    if (message.type === "stroke:end") {
      const strokeId = safeText(message.strokeId);
      const stroke = strokes.get(strokeId);
      if (!stroke || stroke.userId !== userId) return;

      broadcast({ type: "stroke:end", strokeId }, ws);
      return;
    }

    if (message.type === "stroke:erase") {
      const erasedIds = Array.isArray(message.strokeIds) ? eraseStrokes(message.strokeIds) : [];
      if (erasedIds.length > 0) {
        broadcast({ type: "stroke:erase", strokeIds: erasedIds }, ws);
      }
    }
  });

  ws.on("close", () => {
    clients.delete(ws);
    users.delete(userId);
    broadcast({ type: "user:left", userId });
  });
});

if (isProduction) {
  app.use(express.static(path.join(rootDir, "dist")));
  app.get("*", (_req, res) => {
    res.sendFile(path.join(rootDir, "dist", "index.html"));
  });
} else {
  const { createServer: createViteServer } = await import("vite");
  const vite = await createViteServer({
    root: rootDir,
    server: { middlewareMode: true, hmr: { server } },
    appType: "spa"
  });

  app.use(vite.middlewares);
}

function getLocalAddresses() {
  return Object.values(os.networkInterfaces())
    .flat()
    .filter((entry) => entry && entry.family === "IPv4" && !entry.internal)
    .map((entry) => entry.address);
}

server.listen(port, "0.0.0.0", () => {
  const localUrls = getLocalAddresses().map((address) => `http://${address}:${port}`);

  console.log(`Canview running at http://localhost:${port}`);
  if (localUrls.length > 0) {
    console.log("Local network URLs:");
    for (const url of localUrls) {
      console.log(`  ${url}`);
    }
  }
});
