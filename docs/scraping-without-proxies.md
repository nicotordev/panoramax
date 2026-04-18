# Scraping efectivo desde una máquina local sin redes de proxies

Este documento resume cómo extraer datos públicos de forma **sostenible** cuando trabajas desde **una sola IP** (tu hogar, oficina o un VPS pequeño) y **no** cuentas con pools de proxies residenciales o datacenter. El objetivo es maximizar la tasa útil de éxito sin depender de infraestructura cara, priorizando **respeto al sitio**, **estabilidad del scraper** y **cumplimiento razonable** de reglas explícitas.

> **Aviso:** No es asesoría legal. Revisa términos de uso, políticas del sitio y normativa aplicable (incluida protección de datos) antes de automatizar el acceso. Si existe API oficial, feed o dump, suele ser la vía preferida.

## 1. Cuándo tiene sentido scrapear sin proxies

Sin rotación de IP, el scraping encaja bien cuando:

- El **volumen** es moderado: decenas o cientos de páginas por ejecución, no millones de URLs al día desde la misma IP.
- Puedes **espaciar** peticiones en el tiempo (horas o días entre corridas completas).
- El sitio **no** impone protecciones extremas (por ejemplo, desafíos constantes tipo CAPTCHA en cada vista) o estás dispuesto a aceptar fricción manual ocasional.
- Tu caso de uso tolera **latencia**: completar un job en 30–60 minutos puede ser aceptable si evita bloqueos.

Si necesitas **alto paralelismo** sostenido contra el mismo dominio, los proxies no son un “atajo ético”: siguen concentrando carga en el origen. En ese escenario, la respuesta correcta suele ser **API acordada**, **acceso autorizado** o **reducir ambición** (muestreo, ventanas de crawl).

## 2. Límites reales de una sola IP

Desde una IP fija ocurre lo siguiente:

- Los límites del sitio suelen ser **por IP** y a veces por **sesión** o **cuenta**. Un exceso de solicitudes dispara **429**, **403**, o bloqueos temporales.
- **No** hay forma honesta de “competir” con un datacenter que dispara miles de req/s: tu ventaja es **ser predecible y ligero**.
- Si te bloquean, **recuperar confianza** puede llevar horas o días; por eso la prevención (throttling + caching) importa más que los parches reactivos.

## 3. Principios operativos (lo que más impacto tiene)

### 3.1 Preferir fuentes permitidas o estructuradas

Orden típico de preferencia:

1. **API pública o documentada** (con límites explícitos).
2. **Feeds** (RSS, Atom, iCal) o **exportaciones** / **dumps** oficiales.
3. **HTML** solo cuando no hay alternativa o el volumen es acotado.

Esto reduce fragilidad (menos cambios de DOM) y clarifica expectativas de uso.

### 3.2 `robots.txt`, términos del servicio y “polite crawl”

- Consulta `https://<dominio>/robots.txt` y respeta reglas **`Disallow`** y **`Crawl-delay`** cuando existan. Es el contrato social más antiguo de la web; ignorarlo aumenta riesgo reputacional y técnico.
- Lee el **ToS**: algunos sitios prohíben scraping aunque los datos sean públicos en el navegador. La decisión de continuar es **tuya** y debe ser consciente del contexto (personal, comercial, jurisdicción).

### 3.3 Identifícate con un User-Agent honesto

Usa un `User-Agent` descriptivo que incluya **nombre del proyecto** y **canal de contacto** (correo o URL). Ejemplo de intención:

```http
User-Agent: PanoramaxIngest/1.0 (+https://ejemplo.com/contacto; ingest@ejemplo.com)
```

Evita fingir ser Googlebot o un navegador genérico sin contexto: dificulta el diagnóstico cuando algo falla y erosiona confianza.

### 3.4 Limitación de tasa **por dominio**, no “por instancia olvidadiza”

Reglas prácticas de partida (ajústalas según respuesta del servidor):

- **Concurrencia baja:** 1–3 solicitudes simultáneas al mismo host; muchas guías sugieren 2–5 como techo razonable para no parecer un pico anómalo.
- **Intervalo entre solicitudes:** empezar en el rango de **1 solicitud cada 2–5 segundos** por dominio y subir solo si las métricas lo permiten.
- **Jitter:** suma variación aleatoria pequeña al delay (por ejemplo ±20–40%) para no generar un patrón metronómico perfecto.
- **Horarios:** si puedes, corre ingestas pesadas en **horas valle** del sitio (noche local del público objetivo).

Lo importante es internalizar que el límite moral y práctico es **carga en el origen**, no “cuántas IPs tengo”.

### 3.5 Colas, reintentos y backoff exponencial

Implementa una cola central por host con:

- **Reintentos** solo para errores transitorios (timeouts, **503**, **502**, a veces **429**).
- **Backoff exponencial** con techo (por ejemplo 1s → 2s → 4s → … hasta un máximo).
- Respeto explícito a **`Retry-After`** en **429** y **503** cuando venga en la respuesta.

Deja de insistir tras un número razonable de fallos y **alerta** en lugar de apretar el acelerador.

### 3.6 Sesión HTTP coherente

- Reutiliza **cookies** y **conexiones** (keep-alive) como lo haría un navegador.
- Configura cabeceras mínimas creíbles: `Accept-Language`, `Accept` acorde al tipo de recurso, y **`Referer`** cuando el sitio espera navegación secuencial (con cuidado de no violar políticas).
- Evita descargar assets que no necesitas (fuentes, imágenes masivas) si solo te interesa el HTML o un JSON embebido.

### 3.7 Caché y condicionales

Para trabajo iterativo sobre las mismas URLs:

- Persiste respuestas y **ETags** / **`Last-Modified`** para usar **`If-None-Match`** / **`If-Modified-Since`** cuando el servidor lo soporte.
- Guarda un **snapshot mínimo** (raw o parseado) para depuración sin repetir fetch.

Esto baja dramáticamente la presión sobre el sitio durante desarrollo y re-ejecuciones.

## 4. Contenido generado por JavaScript

Si el HTML inicial está vacío y los datos llegan vía XHR/fetch:

- Valora **interceptar las mismas peticiones API** que usa el front (a menudo JSON más estable que el DOM).
- Si necesitas navegador real, **Playwright** o **Puppeteer** con un solo contexto y los mismos límites de tasa: un headless no es excusa para paralelizar 50 pestañas contra el mismo dominio.
- Desactiva imágenes y bloquea dominios de analytics si eso reduce ruido y ancho de banda **sin** saltarte controles de seguridad.

## 5. Ingeniería del scraper: robustez ante cambios

- **Selectores frágiles** (`div > div:nth-child(3)`) rompen con rediseños. Prefiere atributos estables, microdata, JSON-LD embebido, o rutas de API internas documentadas en el tráfico de red.
- Versiona tu extractor y registra **hash** o fecha de la página para saber cuándo cambió el layout.
- Separa claramente: **fetch** → **parse** → **normalización**, para reintentar solo la capa que falló.

## 6. Observabilidad

Mínimo viable:

- Log de URL, código HTTP, latencia y **ID de corrida**.
- Contadores de **429/403** por dominio; si suben, **baja** la tasa automáticamente (throttling adaptativo).
- Métricas de “páginas útiles por hora”; si caen sin que el HTML cambió, sospecha bloqueo suave o redirección a intersticiales.

## 7. Qué **no** hacer (aunque “funcione” un tiempo)

- Disparar decenas de hilos contra el mismo sitio desde casa.
- Rotar User-Agents falsos o headers aleatorios para **engañar** al propietario del sitio.
- Ignorar sistemáticamente `robots.txt` o límites claros solo porque “es público”.
- Confiar en que “si me bloquean cambio de VPN y listo”: es la misma dinámica de adversario, con más fricción operativa.

## 8. Cuándo los proxies entran en conversación (sin heroísmos técnicos)

Aunque este documento asume **sin proxies**, conviene ser explícito:

- Si el sitio **requiere** interacción humana repetida, evalúa **acuerdo de datos**, no evasión.
- Si tu IP residencial ya está **quemada**, pausar días o pedir acceso oficial suele ser más barato que una guerra de infraestructura.
- Si el negocio depende de volumen masivo multi-dominio, el diseño correcto probablemente es **pago al proveedor**, **licencia**, o **producto** que no dependa de scraping continuo.

## 9. Checklist rápido antes de la primera corrida

- [ ] ¿Existe API, feed o dump que evite HTML?
- [ ] ¿Leí `robots.txt` y el ToS con ojo crítico?
- [ ] ¿User-Agent con contacto?
- [ ] ¿Límite de concurrencia y delay por host definidos?
- [ ] ¿Manejo de 429/503 con `Retry-After` y backoff?
- [ ] ¿Caché local / condicionales para no repetir trabajo?
- [ ] ¿Logs suficientes para saber si me están limitando?

---

## Referencias y lectura adicional

- Convención histórica de exclusión de robots: [robots.txt](https://www.robotstxt.org/) (formato y propósito).
- Marco de “crawl educado” y límites morales de carga: artículos sobre **ethical web scraping** y rate limiting orientados a no saturar infraestructura ajena (p. ej. guías en [Databay – Ethical Web Scraping](https://databay.com/blog/ethical-web-scraping-guide) y discusiones sobre throttling por dominio).
- Discusión de técnicas generales sin proxies: [How to Scrape Websites Without Proxies](https://scrapegraphai.com/blog/scraping-without-proxies) (énfasis en lentitud, jitter y manejo de errores; contrastar siempre con políticas del sitio concreto).
- En ecosistemas R, el paquete **polite** resume bien la filosofía *seek permission (robots), take slowly, never ask twice*: [Be Nice on the Web • polite](https://dmi3kno.github.io/polite/index.html).

Si este repositorio incorpora nuevas fuentes de eventos, cruza estas prácticas con la estrategia de ingestión descrita en [`strategy/03-data-sources.md`](./strategy/03-data-sources.md).
