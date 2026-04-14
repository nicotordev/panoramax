import "dotenv/config";
import { serve } from "@hono/node-server";
import app from "./app.js";

const port = Number(process.env.PORT ?? 3001);
const hostname = process.env.HOST ?? "0.0.0.0";

console.log("🚀 Starting Panoramax API server...");
console.log(`🌎 Host: ${hostname}`);
console.log(`🔌 Port: ${port}`);
console.log(`📦 Node Environment: ${process.env.NODE_ENV ?? "development"}`);

const server = serve(
  {
    fetch: app.fetch,
    port,
    hostname,
  },
  (info) => {
    console.log(
      `✅  Server is running at http://${info.family}:${info.port} 🚦`,
    );
  },
);

function shutdown(signal: string) {
  console.log(`\n${signal} received, closing server...`);
  server.close((err) => {
    if (err) {
      console.error(err);
    }
    process.exit(err ? 1 : 0);
  });
  setTimeout(() => process.exit(0), 10_000).unref();
}

process.once("SIGINT", () => shutdown("SIGINT"));
process.once("SIGTERM", () => shutdown("SIGTERM"));

