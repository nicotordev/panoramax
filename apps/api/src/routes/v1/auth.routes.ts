import type { AuthObject } from "@clerk/backend";
import { Hono } from "hono";
import { requireClerkAuth } from "../../middleware/require-clerk.js";

const authRoutes = new Hono<{ Variables: { clerkAuth: AuthObject } }>();

authRoutes.use("*", requireClerkAuth());

authRoutes.get("/me", (c) => {
  const auth = c.get("clerkAuth");
  if (auth.tokenType !== "session_token") {
    return c.json(
      { error: "This endpoint expects a user session token from Clerk." },
      400,
    );
  }
  return c.json({
    userId: auth.userId,
    sessionId: auth.sessionId,
    orgId: auth.orgId ?? null,
  });
});

export default authRoutes;
