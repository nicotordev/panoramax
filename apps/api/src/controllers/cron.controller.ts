import type { Context } from "hono";
import cronService from "../services/cron.service.js";

class CronController {
  public algoliaSyncEvents = async (c: Context) => {
    try {
      const synced = await cronService.syncEvents();
      if (!synced) {
        return c.json(
          { ok: false, message: "Failed to sync events to Algolia" },
          500,
        );
      }

      return c.json({ ok: true, message: "Events synced to Algolia" });
    } catch (error) {
      return c.json(
        { ok: false, message: "Failed to sync events to Algolia" },
        500,
      );
    }
  };
}

const cronController = new CronController();

export default cronController;
