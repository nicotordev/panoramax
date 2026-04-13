/**
 * Sincroniza manualmente todos los eventos de DB hacia Algolia.
 *
 * Requiere:
 * - DATABASE_URL
 * - ALGOLIA_APP_ID
 * - ALGOLIA_API_KEY
 * Opcional:
 * - EVENTS_INDEX_NAME (default: events_index)
 *
 * Uso:
 *   pnpm --dir apps/api run algolia:sync-events
 */
import "dotenv/config";
import cronService from "../services/cron.service.js";

function hasValue(name: string): boolean {
  return Boolean(process.env[name]?.trim());
}

async function main() {
  const requiredEnv = ["DATABASE_URL", "ALGOLIA_APP_ID", "ALGOLIA_API_KEY"];
  const missing = requiredEnv.filter((name) => !hasValue(name));

  if (missing.length > 0) {
    console.error(`Faltan variables de entorno: ${missing.join(", ")}`);
    process.exit(1);
  }

  const indexName = process.env.EVENTS_INDEX_NAME ?? "events_index";
  console.log(`Iniciando sync manual DB -> Algolia (index: ${indexName})...`);

  const ok = await cronService.syncEvents();
  if (!ok) {
    console.error("El sync manual a Algolia falló.");
    process.exit(1);
  }

  console.log("Sync manual completado.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
