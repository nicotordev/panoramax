# Product To-Do List

Lista accionable derivada de [`strategy/05-product-roadmap.md`](./strategy/05-product-roadmap.md).

## Fase 1

### Monorepo y app base

- [ ] Definir estructura final del monorepo para `api` y `frontend`.
- [ ] Alinear scripts raíz para desarrollo, build y typecheck.
- [ ] Configurar variables de entorno por app y documentarlas.
- [ ] Dejar una base mínima de configuración para despliegue.
- [ ] Documentar setup local para nuevos contributors.

### Pipeline simple de ingesta

- [ ] Elegir las primeras fuentes a integrar.
- [ ] Definir esquema unificado de datos para eventos.
- [ ] Implementar primer flujo de extracción desde fuentes públicas.
- [ ] Normalizar fechas, comunas, categorías y precios.
- [ ] Guardar URL canónica y metadata mínima por evento.
- [ ] Registrar errores básicos de scraping e ingesta.

### Base de datos de eventos

- [ ] Diseñar modelo inicial de `events`.
- [ ] Agregar campos para fuente, fecha, venue, comuna, categoría y precio.
- [ ] Definir estrategia de IDs y unicidad básica.
- [ ] Implementar persistencia para eventos ingeridos.
- [ ] Preparar soporte para actualizaciones y reingestas.
- [ ] Dejar lista una estrategia simple para marcar eventos expirados.

### Frontend con feed y filtros

- [ ] Crear feed principal de panoramas.
- [ ] Mostrar cards con información esencial y CTA hacia la fuente.
- [ ] Implementar filtros por fecha.
- [ ] Implementar filtros por comuna.
- [ ] Implementar filtros por categoría.
- [ ] Implementar filtros por precio.
- [ ] Crear vista detalle de evento con metadata normalizada.
- [ ] Exponer etiquetas editoriales como `gratis`, `hoy`, `esta semana` e `imperdible`.

## Fase 2

### Deduplicación más robusta

- [ ] Definir reglas de deduplicación por título, venue y fecha.
- [ ] Agregar heurísticas para variaciones de nombres entre fuentes.
- [ ] Separar duplicados probables de duplicados confirmados.
- [ ] Medir porcentaje de eventos deduplicados correctamente.
- [ ] Preparar revisión manual para casos ambiguos.

### Favoritos y perfiles

- [ ] Crear sistema de cuentas de usuario básico.
- [ ] Permitir guardar eventos en favoritos.
- [ ] Crear perfil mínimo con intereses principales.
- [ ] Asociar favoritos y preferencias al perfil.
- [ ] Diseñar flujo de acceso sin fricción para usuarios nuevos.

### Recomendaciones básicas por interés

- [ ] Definir primeras señales de interés desde favoritos y navegación.
- [ ] Etiquetar eventos para matching simple por categoría y tags.
- [ ] Ordenar feed con una capa básica de relevancia.
- [ ] Crear bloques de recomendaciones personalizadas.
- [ ] Medir CTR y guardados sobre contenido recomendado.

### Newsletter automática

- [ ] Definir plantilla editorial para newsletter semanal.
- [ ] Crear selección automática según fecha, comuna e interés.
- [ ] Generar contenido reutilizando metadata normalizada.
- [ ] Integrar herramienta de envío o preparar export.
- [ ] Medir aperturas, clicks y retornos al producto.

## Fase 3

### Submissions de eventos

- [ ] Diseñar formulario para envío de eventos.
- [ ] Definir campos requeridos y validaciones.
- [ ] Crear flujo de revisión antes de publicar.
- [ ] Evitar duplicados al momento de recibir submissions.
- [ ] Registrar fuente y responsable de cada submission.

### Cuentas para organizadores

- [ ] Definir rol de organizador dentro del modelo de usuarios.
- [ ] Permitir que organizadores administren sus eventos enviados.
- [ ] Crear panel mínimo para revisar estado de publicaciones.
- [ ] Agregar historial de submissions y cambios.
- [ ] Definir reglas de aprobación y edición.

### Métricas de clicks y performance

- [ ] Instrumentar clicks hacia fuente original o compra.
- [ ] Medir visitas a detalle de evento.
- [ ] Medir guardados en favoritos.
- [ ] Medir retorno semanal de usuarios.
- [ ] Crear dashboard básico con KPIs del MVP.

### Eventos destacados patrocinados

- [ ] Definir formato de placement patrocinado.
- [ ] Separar claramente contenido orgánico de patrocinado.
- [ ] Crear slots destacados en feed o newsletter.
- [ ] Medir performance de eventos patrocinados.
- [ ] Documentar lineamientos editoriales y comerciales.

## Fase 4

### Expansión a otras ciudades de Chile

- [ ] Priorizar siguientes ciudades según densidad de oferta y demanda.
- [ ] Adaptar fuentes e ingesta para cobertura regional.
- [ ] Extender taxonomías de comuna, ciudad y venue.
- [ ] Ajustar navegación para cambiar entre ciudades.
- [ ] Medir supply activo por ciudad antes de escalar más.

### Social features ligeras

- [ ] Definir interacciones sociales de bajo costo operacional.
- [ ] Evaluar follow de usuarios, reacciones o shares guardables.
- [ ] Integrar señales sociales sin degradar discovery principal.
- [ ] Medir uso y efecto sobre retención.

### Listas colaborativas

- [ ] Permitir crear listas temáticas de panoramas.
- [ ] Permitir compartir listas por link.
- [ ] Habilitar colaboración básica entre usuarios.
- [ ] Resolver permisos de edición y visibilidad.
- [ ] Medir creación, compartidos y guardados de listas.

### Mapa personalizado y alertas avanzadas

- [ ] Diseñar experiencia de mapa por ubicación, comuna y categoría.
- [ ] Mostrar eventos sobre mapa con filtros activos.
- [ ] Crear alertas por intereses, zonas o fechas.
- [ ] Definir frecuencia y canal de alertas.
- [ ] Medir activación, apertura y retención asociada a alertas.

## Backlog transversal

- [ ] Mantener curación manual al inicio para asegurar calidad.
- [ ] Revisar riesgos legales sobre contenido, imágenes y descripciones.
- [ ] Validar que el producto responda bien a la pregunta central del MVP.
- [ ] Revisar KPIs iniciales de guardados, retorno semanal, CTR y cobertura.
- [ ] Mantener documentación viva a medida que cambie el roadmap.
