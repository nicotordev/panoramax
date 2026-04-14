import { createMiddleware } from "hono/factory";
import { getAuth } from "@clerk/hono";
import userService from "../services/user.service.js";
import type { User } from "../generated/prisma/client.js";

export function requireClerkAuth() {
  return createMiddleware<{ Variables: { user: User; clerkId: string } }>(
    async (c, next) => {
      const { userId: clerkUserId } = getAuth(c);
      if (!clerkUserId) {
        return c.json({ error: "Unauthorized" }, 401);
      }
      const user = await userService.getOrCreateUserByClerkId(clerkUserId);
      if (!user) {
        return c.json({ error: "Unauthorized" }, 401);
      }
      c.set("user", user);
      c.set("clerkId", clerkUserId);
      await next();
    },
  );
}

export function requireAdminClerkAuth() {
  return createMiddleware<{ Variables: { user: User; clerkId: string } }>(
    async (c, next) => {
      const { userId: clerkUserId } = getAuth(c);
      if (!clerkUserId) {
        return c.json({ error: "Unauthorized" }, 401);
      }
      const user = await userService.getOrCreateUserByClerkId(clerkUserId);
      if (!user) {
        return c.json({ error: "Unauthorized" }, 401);
      }
      if (!(await userService.isAdminClerkUser(clerkUserId))) {
        return c.json({ error: "Forbidden" }, 403);
      }
      c.set("user", user);
      c.set("clerkId", clerkUserId);
      await next();
    },
  );
}
