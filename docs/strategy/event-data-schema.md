# Event Data Schema

## Objetivo

Definir un esquema unificado que sirva para:

- poblar el feed inicial
- deduplicar eventos entre fuentes
- enlazar a la fuente original o compra
- soportar curación y QA

## Principios

- separar datos de origen de datos normalizados
- conservar la trazabilidad completa de la fuente
- modelar lo suficiente para filtro, ranking y deduplicación
- no depender de una sola taxonomía externa

## Modelo recomendado

### Identidad y trazabilidad

- `id`: UUID interno
- `source`: nombre canónico de la fuente, por ejemplo `chile_cultura`, `ticketplus`, `puntoticket`, `gam`
- `source_type`: `editorial`, `venue`, `ticketing`, `organizer`
- `source_event_id`: identificador nativo de la fuente si existe
- `source_url`: URL canónica de la ficha origen
- `ticket_url`: URL de compra o conversión si existe
- `imported_at`: timestamp de ingesta
- `last_seen_at`: última vez que la fuente confirmó el evento
- `raw_title`: título original sin normalizar
- `raw_payload`: JSON mínimo o snapshot estructurado para debugging

### Contenido principal

- `title`: título normalizado para mostrar
- `subtitle`: bajada breve si existe
- `summary`: resumen corto para cards y snippets
- `description`: descripción extendida si es necesario
- `language`: idioma principal del contenido
- `image_url`: imagen principal
- `image_attribution`: atribución o fuente de imagen cuando aplique

### Tiempo

- `start_at`: inicio en formato timestamp
- `end_at`: término en formato timestamp nullable
- `timezone`: por defecto `America/Santiago`
- `all_day`: boolean
- `date_text`: texto de respaldo cuando la fuente no entrega hora estructurada
- `status`: `scheduled`, `cancelled`, `postponed`, `sold_out`, `expired`, `draft`

### Lugar

- `venue_name`: nombre del venue normalizado
- `venue_raw`: nombre del venue en origen
- `address`: dirección libre si existe
- `commune`: comuna normalizada
- `city`: ciudad normalizada
- `region`: región normalizada
- `country`: por defecto `CL`
- `latitude`: nullable
- `longitude`: nullable
- `is_online`: boolean
- `location_notes`: observaciones de ubicación o acceso

### Precio y conversión

- `is_free`: boolean
- `price_min`: nullable
- `price_max`: nullable
- `currency`: por defecto `CLP`
- `price_text`: texto original de precio
- `availability_text`: texto libre como `últimas entradas`, `agotado`, `preventa`

### Taxonomía y discovery

- `category_primary`: categoría principal interna
- `category_secondary`: subcategoría interna nullable
- `categories_source`: arreglo de categorías originales de la fuente
- `tags`: arreglo de tags internos
- `audience`: `adult`, `family`, `kids`, `all_ages`, nullable
- `editorial_labels`: arreglo como `gratis`, `hoy`, `esta_semana`, `imperdible`

### Calidad y operación

- `dedupe_key`: clave calculada para matching inicial
- `canonical_event_id`: nullable, referencia al evento canónico si se fusionó
- `quality_score`: puntaje interno de completitud/calidad
- `needs_review`: boolean
- `review_notes`: observaciones editoriales o de QA

## Campos mínimos obligatorios para V1

- `source`
- `source_type`
- `source_url`
- `title`
- `start_at`
- `venue_name`
- `commune`
- `city`
- `category_primary`

## Campos mínimos recomendados para feed útil

- `summary`
- `image_url`
- `price_min`
- `price_max`
- `is_free`
- `ticket_url`
- `tags`
- `editorial_labels`

## Taxonomía inicial sugerida

### Categorías principales

- `music`
- `theatre`
- `standup`
- `dance`
- `festival`
- `fair`
- `exhibition`
- `food_drink`
- `family`
- `sports`
- `workshop`
- `special_experience`

### Etiquetas editoriales

- `gratis`
- `hoy`
- `manana`
- `esta_semana`
- `fin_de_semana`
- `agotandose`
- `imperdible`

## Dedupe v1

Calcular `dedupe_key` con una combinación de:

- título normalizado
- venue normalizado
- fecha local de inicio

Heurísticas adicionales:

- tolerancia a acentos, mayúsculas y puntuación
- normalización de venue alias como `Movistar Arena` vs `Movistar Arena Santiago`
- similitud parcial de títulos para giras repetidas o funciones múltiples

## Notas por tipo de fuente

### Fuentes editoriales y culturales

- suelen tener mejor descripción y contexto
- a veces no tienen precio estructurado
- pueden servir como canonical source para copy

### Ticketeras

- suelen tener mejor precio, venue y disponibilidad
- a veces tienen naming promocional menos limpio
- son una buena fuente de `ticket_url`

## Siguiente paso técnico

Este esquema ya es suficiente para diseñar la tabla `events` y la primera capa de normalización en Prisma.
