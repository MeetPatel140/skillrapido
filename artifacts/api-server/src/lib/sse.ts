import { Request, Response } from "express";
import { logger } from "./logger";

interface ConnectedClient {
  res: Response;
  userId: number;
  role: string;
}

const clients = new Map<number, ConnectedClient>();

export function sseHandler(req: Request, res: Response) {
  const userId = parseInt((req.query.userId as string) || "0");
  const role = (req.query.role as string) || "customer";

  if (!userId) {
    res.status(400).json({ error: "Missing userId" });
    return;
  }

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders();

  clients.set(userId, { res, userId, role });
  logger.info({ userId, role }, "SSE client connected");

  sendToClient(res, { type: "connected", userId });

  const heartbeat = setInterval(() => {
    res.write(": ping\n\n");
  }, 25000);

  req.on("close", () => {
    clearInterval(heartbeat);
    clients.delete(userId);
    logger.info({ userId }, "SSE client disconnected");
  });
}

function sendToClient(res: Response, data: object) {
  res.write(`data: ${JSON.stringify(data)}\n\n`);
}

export function broadcastToUser(userId: number, data: object): boolean {
  const client = clients.get(userId);
  if (client) {
    sendToClient(client.res, data);
    return true;
  }
  return false;
}

export function broadcastToProviders(providerIds: number[], data: object): number {
  let sent = 0;
  if (providerIds.length === 0) {
    // broadcast to all connected providers
    for (const client of clients.values()) {
      if (client.role === "provider") {
        sendToClient(client.res, data);
        sent++;
      }
    }
  } else {
    for (const id of providerIds) {
      if (broadcastToUser(id, data)) sent++;
    }
  }
  return sent;
}

export function getOnlineProviderIds(): number[] {
  return Array.from(clients.values())
    .filter((c) => c.role === "provider")
    .map((c) => c.userId);
}
