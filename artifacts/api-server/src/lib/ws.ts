import { WebSocketServer, WebSocket } from "ws";
import { IncomingMessage } from "http";
import { Server } from "http";
import { logger } from "./logger";

interface ConnectedClient {
  ws: WebSocket;
  userId: number;
  role: string;
}

const clients = new Map<number, ConnectedClient>();

export function createWsServer(server: Server) {
  const wss = new WebSocketServer({ server, path: "/ws" });

  wss.on("connection", (ws: WebSocket, req: IncomingMessage) => {
    const url = new URL(req.url || "", "http://localhost");
    const userId = parseInt(url.searchParams.get("userId") || "0");
    const role = url.searchParams.get("role") || "customer";

    if (!userId) {
      ws.close(1008, "Missing userId");
      return;
    }

    clients.set(userId, { ws, userId, role });
    logger.info({ userId, role }, "WS client connected");

    ws.on("close", () => {
      clients.delete(userId);
      logger.info({ userId }, "WS client disconnected");
    });

    ws.on("error", (err) => {
      logger.error({ err, userId }, "WS error");
      clients.delete(userId);
    });

    ws.send(JSON.stringify({ type: "connected", userId }));
  });

  return wss;
}

export function broadcastToUser(userId: number, data: object) {
  const client = clients.get(userId);
  if (client && client.ws.readyState === WebSocket.OPEN) {
    client.ws.send(JSON.stringify(data));
    return true;
  }
  return false;
}

export function broadcastToProviders(providerIds: number[], data: object) {
  let sent = 0;
  for (const id of providerIds) {
    if (broadcastToUser(id, data)) sent++;
  }
  return sent;
}

export function getOnlineProviderIds(): number[] {
  return Array.from(clients.values())
    .filter((c) => c.role === "provider")
    .map((c) => c.userId);
}
