// Session state and logout.
import { deleteCookie } from "hono/cookie";
import { VERSION } from "../core/version.ts";
import { businessDay } from "../core/time.ts";
import type { App, AppDeps } from "./context.ts";
import { SESSION_COOKIE } from "./session.ts";

export function registerSessionRoutes(app: App, { config, session, now }: AppDeps): void {
  app.get("/api/session", (c) => {
    const user = session.currentUser(c);
    return c.json({
      demoMode: config.demoMode,
      version: VERSION,
      today: businessDay(now()),
      user: user
        ? {
            id: user.id,
            name: user.name,
            role: user.role,
            companyId: user.companyId,
            companyName: user.companyName,
            vertical: user.vertical,
          }
        : null,
    });
  });

  app.post("/api/logout", (c) => {
    deleteCookie(c, SESSION_COOKIE, { path: "/" });
    return c.json({ ok: true });
  });
}
