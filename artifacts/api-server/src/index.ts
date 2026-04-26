import http from "http";
import app from "./app";
import { logger } from "./lib/logger";
import { seedAdmin } from "./lib/seed";

const rawPort = process.env["PORT"] || "8080";

if (!rawPort) {
  throw new Error("PORT environment variable is required but was not provided.");
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

const server = http.createServer(app);

server.listen(port, async () => {
  logger.info({ port }, "Server listening");
  await seedAdmin();
});
