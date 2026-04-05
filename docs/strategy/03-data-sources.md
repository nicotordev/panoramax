# Data Sources

## Criterios para priorizar fuentes iniciales

- densidad de eventos relevantes en Santiago
- estructura relativamente estable para extracción
- cobertura de fecha, venue y ubicación
- mezcla de discovery editorial y conversión a compra
- utilidad para deduplicación posterior
- bajo riesgo operativo para un MVP

## Fuentes elegidas para la primera ola

### Discovery y cartelera cultural

- **Chile Cultura**: base amplia de eventos culturales y actividades con buscador, categorías y fichas individuales. Sirve para densidad inicial y cobertura gratuita o institucional.
- **GAM**: calendario estructurado con categoría, título, hora y fichas por evento. Alto valor para teatro, danza, música y actividades culturales en Santiago.
- **Teatro Municipal de Santiago**: cartelera oficial con categorías y programación de temporada. Buena calidad de metadata para artes escénicas.
- **Agenda Musical**: lista de conciertos, venues y productoras. Útil para cubrir música en vivo y reforzar el vertical más demandado.

### Ticketeras para primera ola comercial

- **Ticketplus**: buen mix de conciertos, teatro, stand-up, fiestas y eventos en Región Metropolitana con páginas por región y taxonomías navegables.
- **PuntoTicket**: alta cobertura para conciertos masivos, festivales, humor, fútbol y recintos principales como Movistar Arena, Caupolicán y Coliseo.

## Fuentes para segunda ola

- **Passline**: relevante para fiestas, clubes y nichos, pero con mayor fricción técnica en exploración inicial.
- **Fever Santiago**: interesante para experiencias urbanas y planes de ocio, pero no es prioritaria para densidad inicial del feed.
- **Ticketmaster Chile**: útil para giras globales, pero probablemente menos crítica que PuntoTicket para Santiago en etapa 1.
- **Recintos adicionales** como CorpArtes, Matucana 100, CEINA, Teatro Nescafé y Movistar Arena oficial: buenos candidatos para mejorar calidad y deduplicación por venue.

## Fuentes descartadas para partir

- **Chile Travel**: más turístico que orientado a cartelera semanal accionable.
- **Hoteles, centros de convenciones y directorios de matrimonios**: bajo valor para la pregunta central del MVP y difícil conversión a uso recurrente del feed.
- **Finde**: gran referencia editorial, pero no mostró una estructura clara y consistente para una ingesta inicial simple en esta revisión.

## Orden recomendado de integración

1. **Chile Cultura**
2. **GAM**
3. **Ticketplus**
4. **PuntoTicket**
5. **Teatro Municipal de Santiago**
6. **Agenda Musical**

## Estrategia de ingestión

1. Partir con fuentes públicas y oficiales que ya exponen calendario o cartelera.
2. Sumar una ticketera con buena taxonomía regional y luego una de alta cobertura masiva.
3. Normalizar campos a un esquema único antes de poblar el feed.
4. Mantener `raw payload` o snapshot mínimo de origen para debugging.
5. Deduplicar por título, venue, fecha y heurísticas.
6. Guardar URL canónica de origen y URL de compra cuando exista.
7. Separar fuentes de discovery editorial de fuentes de ticketing para ranking y fallback.

## Señales observadas en la investigación

- **Chile Cultura** expone un buscador público con filtros por categoría y fichas de eventos con lugar y región.
- **GAM** publica un calendario mensual con título, categoría, horario y enlaces a detalle.
- **Teatro Municipal** expone programación por categorías y enlaza a ticketera propia.
- **Agenda Musical** mantiene una lista de conciertos con filtros por mes, venue y productora.
- **Ticketplus** tiene páginas por Región Metropolitana, ciudad y taxones de categoría.
- **PuntoTicket** ofrece calendario general, categorías y carteleras por recinto.

## Evidencia revisada

Revisión manual con Bright Data el **5 de abril de 2026** sobre:

- `https://chilecultura.gob.cl/events/search/`
- `https://gam.cl/es/calendario/`
- `https://municipal.cl/espectaculos/`
- `https://www.agendamusical.cl/lista-conciertos/`
- `https://ticketplus.cl/states/region-metropolitana`
- `https://www.puntoticket.com/todos`

## Esquema unificado

El esquema unificado de eventos quedó documentado en [`event-data-schema.md`](./event-data-schema.md).

## Campos mínimos históricos

Estos campos siguen siendo una buena base mínima para una primera extracción:

- `source`
- `source_url`
- `title`
- `summary`
- `start_at`
- `end_at`
- `venue_name`
- `commune`
- `city`
- `price_min`
- `price_max`
- `category`
- `tags`
- `image_url`

## Riesgos de datos

- cambios de markup
- eventos duplicados entre fuentes
- eventos sin comuna clara
- cancelaciones no propagadas
- imágenes y descripciones con derechos de terceros

## Principio operativo

Guardar metadata y enlazar a la fuente. Evitar copiar más contenido del necesario.
