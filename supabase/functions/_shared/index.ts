import { Context, MiddlewareHandler } from "jsr:@hono/hono";

declare module "jsr:@hono/hono" {
  interface ContextVariableMap {
    userId: string;
    orgId: string;
  }
}

export const extractUserAndOrgId: MiddlewareHandler = async (
  c: Context,
  next
) => {
  const authHeader = c.req.header("Authorization");
  if (!authHeader) {
    return c.json({ error: "Authorization header missing" }, 401);
  }

  const token = authHeader.split(" ")[1];
  if (!token) {
    return c.json({ error: "Token missing" }, 401);
  }

  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    const userId = payload["sub"];
    const orgId = payload["o"]["id"];

    if (!userId || !orgId) {
      return c.json({ error: "Invalid token payload" }, 401);
    }

    c.set("userId", userId);
    c.set("orgId", orgId);

    await next();
  } catch (error) {
    return c.json({ error: "Invalid token" }, 401);
  }
};
