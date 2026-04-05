# Data Sources

## Fuentes recomendadas para partir

### Públicas y más estables

- Santiago Cultura
- Ministerio de las Culturas
- Chile Travel

### Comerciales y complementarias

- Ticketplus
- PuntoTicket
- Eventbrite Chile

## Estrategia de ingestión

1. Tomar primero fuentes públicas con HTML simple y contenido editorial.
2. Agregar ticketeras solo en categorías con alta demanda.
3. Normalizar campos a un esquema único.
4. Deduplicar por título, venue, fecha y heurísticas.
5. Guardar URL canónica de origen.

## Campos mínimos por evento

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
