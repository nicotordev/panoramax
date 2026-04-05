import { Hono } from "hono";
import { prisma } from "../../lib/prisma.js";

const healthRoutes = new Hono();

// Simple API up check
healthRoutes.get("/", (c) => {
  return c.json({ ok: true, message: "API is running" });
});

// Database connectivity check
healthRoutes.get("/db", async (c) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return c.json({ ok: true, message: "Database connection OK" });
  } catch (error) {
    return c.json({ ok: false, error: "Database connection failed" }, 500);
  }
});

// Prisma status check
healthRoutes.get("/prisma", async (c) => {
  try {
    // This just checks the connection by performing a trivial query
    await prisma.$queryRaw`SELECT 1`;
    return c.json({ ok: true, client: "prisma" });
  } catch (error) {
    return c.json({ ok: false, error: "Prisma error" }, 500);
  }
});

// Health with timestamp
healthRoutes.get("/timestamp", (c) => {
  return c.json({ ok: true, timestamp: new Date().toISOString() });
});

export default healthRoutes;
