import "dotenv/config";
import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { ingestChileCultura } from "./lib/ingestion/chileCultura.js";
import { prisma } from "./lib/prisma.js";

const app = new Hono();
const port = Number(process.env.PORT ?? 3001);
const hostname = process.env.HOST ?? "0.0.0.0";

app.get("/", (c) => {
  return c.text("Hello Hono!");
});

app.get("/health/db", async (c) => {
  await prisma.$queryRaw`SELECT 1`;

  return c.json({ ok: true });
});

app.get("/sources/chile-cultura/events", async (c) => {
  const region = c.req.query("region") ?? undefined;
  const page = Number(c.req.query("page") ?? "1");
  const limit = c.req.query("limit") ? Number(c.req.query("limit")) : undefined;

  const result = await ingestChileCultura({
    region,
    page,
    limit,
    persist: false,
  });

  return c.json(result);
});

app.post("/sources/chile-cultura/import", async (c) => {
  const region = c.req.query("region") ?? undefined;
  const page = Number(c.req.query("page") ?? "1");
  const limit = c.req.query("limit") ? Number(c.req.query("limit")) : undefined;

  const result = await ingestChileCultura({
    region,
    page,
    limit,
    persist: true,
  });

  return c.json(result);
});

serve({
  fetch: app.fetch,
  port,
  hostname,
}, (info) => {
  console.log(`Server is running on http://${hostname}:${info.port}`);
});
