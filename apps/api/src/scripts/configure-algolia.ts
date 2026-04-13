/**
 * Aplica la configuración del índice de eventos en Algolia (p. ej. facets).
 *
 * Requiere: ALGOLIA_APP_ID, ALGOLIA_API_KEY con permiso `settings` (clave Admin).
 * Opcional: EVENTS_INDEX_NAME (por defecto `events_index`).
 *
 * Uso: pnpm --dir apps/api run algolia:configure
 */
import "dotenv/config";
import algolia from "../lib/algolia.js";

const indexName = process.env.EVENTS_INDEX_NAME ?? "events_index";

async function main() {
  if (
    !process.env.ALGOLIA_APP_ID?.trim() ||
    !process.env.ALGOLIA_API_KEY?.trim()
  ) {
    console.error("Faltan ALGOLIA_APP_ID o ALGOLIA_API_KEY en el entorno.");
    process.exit(1);
  }

  console.log(`Configurando índice Algolia: ${indexName} …`);
  const ok = await algolia.ensureEventsIndexSettings();
  if (!ok) {
    console.error(
      "setSettings falló (revisa que la API key tenga ACL `settings`, suele ser la clave de administración).",
    );
    process.exit(1);
  }
  console.log(
    "Listo: attributesForFaceting = commune, city, region, categoryPrimary, audience",
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
