import type { AuthObject, User } from "@clerk/backend";
import type { Context } from "hono";
import { Hono } from "hono";
import { requireClerkAuth } from "../../middleware/require-clerk.js";
import responseEnhancer from "../../utils/response-enhancer.js";
import type { ContentfulStatusCode } from "hono/utils/http-status";

const authRoutes = new Hono<{ Variables: { clerkAuth: AuthObject } }>();

authRoutes.use("*", requireClerkAuth());

authRoutes.get(
  "/me",
  (c: Context<{ Variables: { user: User; clerkId: string } }>) => {
    const user = c.get("user");
    const clerkId = c.get("clerkId");
    const body = responseEnhancer.ok(
      { user, clerkId },
      "User fetched successfully",
    );
    return c.json(body, body.status as ContentfulStatusCode);
  },
);

export default authRoutes;
