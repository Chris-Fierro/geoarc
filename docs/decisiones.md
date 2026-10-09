# GEO·ARC — Decisiones y diagnóstico

## 2026-10-08 · Arranque

### Decisiones de producto (Chris)
- No hay código fuente previo: el handoff v1.2 se usa como especificación funcional. **Reescritura desde cero.**
- Núcleo: **envolvente normativa sobre terreno real** (topografía + rasantes/cabida en pendiente + salida CAD/BIM).
- Usuario de corto plazo: **docencia META|Lab** (estudiantes de Arquitectura).
- El estudiante parte **siempre desde un sitio real**: Temuco, cualquier lugar de Chile o del mundo.

### Implicancias técnicas
- DEM global, leído desde el navegador, sin backend:
  - Copernicus GLO-30 (COG en AWS Open Data) — **DSM**: incluye dosel y edificios.
  - Terrarium (AWS Terrain Tiles) — en Chile ≈ SRTM 30 m; referencial.
  - Ladera sintética para clases sin conexión y tests.
  - Más adelante: levantamiento DXF, fotogrametría propia, FABDEM (DTM) pre-procesado para Chile.
- Riesgo Araucanía: en sitios con bosque el DSM puede sobrestimar 10–25 m. Mitigación: metadatos y advertencias
  visibles + importación de levantamiento + comparación DSM/DTM como contenido de clase.
- Proyección: UTM automática según el sitio (cualquier huso, ambos hemisferios).
- Perfiles normativos intercambiables: “OGUC Chile” y “Personalizado” (sitios fuera de Chile).
- Sitio estático (GitHub Pages), sin login.

### Diagnóstico del prototipo anterior (handoff v1.2)
- Motor isométrico SVG/D3 hecho a mano = techo técnico (sin z-buffer, rendimiento, rasantes inclinadas son un problema 3D).
- Bug del dibujo libre: transformaciones de pantalla calculadas a mano; además la inversa isométrica asumía z = 0
  (desfase proporcional a la cota). **Se elimina por diseño**: el lote se dibuja en el mapa, en coordenadas geográficas.
- `insetPolygonBisector`: falla en polígonos cóncavos y supone distanciamiento uniforme (la norma no lo es).
- OSM no aporta cotas ni predios en Chile.
- Grupo normativo por latitud: incorrecto; la OGUC asigna por región administrativa.
- Valores 51°/57°/63° y regla “> 10,5 m (Art. 2.6.12)”: **no verificados**.
- Referente: geonorma.cl (norma, cabida, 3D; según su web, sin topografía, curvas ni exportación).

### Decisiones de implementación v0.1
- Stack: React + TypeScript + Vite + Tailwind; MapLibre (mapa/dibujo); React-Three-Fiber (3D); proj4; geotiff.js; Vitest; Playwright.
- Curvas: marching squares propio (necesitamos isolíneas abiertas/cerradas para DXF; d3-contour entrega polígonos de banda).
- Envolvente como **campo de alturas** con rasantes trazadas desde cada punto del deslinde a su cota natural; se
  registra la restricción gobernante por celda. No se usa offset de polígonos (Clipper) en v0.1.
- DXF R12 propio (máxima compatibilidad), en UTM absolutas.
- Valores normativos solo en `src/core/normativa/perfiles.ts`, con `verificado`/`fuente`. Todos los OGUC están en `false`.

### Pendientes abiertos
- Verificar CORS de Copernicus y Terrarium en navegador real (el entorno de desarrollo bloqueó la prueba).
  → Resuelto el 2026-10-09 (ver abajo).
- Chris: fijar valores OGUC verificados.

## 2026-10-09 · Publicación y verificación de CORS

### Publicación
- Repo público: https://github.com/Chris-Fierro/geoarc
- GitHub Pages con GitHub Actions como fuente (`build_type=workflow`): https://chris-fierro.github.io/geoarc/

### CORS de las fuentes de elevación
Verificado con `curl` desde la red de Chris y con `fetch()` en navegador real (Chromium) sobre el sitio publicado.
Origin: `https://chris-fierro.github.io`.

| Fuente | Petición | Estado | `Access-Control-Allow-Origin` |
|---|---|---|---|
| Copernicus GLO-30 (`copernicus-dem-30m.s3.amazonaws.com`) | GET/HEAD con `Range: bytes=0-1023` | 206 | **ausente** |
| Copernicus GLO-30 | OPTIONS (preflight) | **403** — `CORSResponse: CORS is not enabled for this bucket.` | — |
| Copernicus GLO-30, endpoint regional (`…s3.eu-central-1.amazonaws.com`) | GET / OPTIONS | 206 / 403, mismo mensaje | ausente |
| Copernicus GLO-30 | `fetch()` en navegador | **bloqueado** — `No 'Access-Control-Allow-Origin' header is present` | — |
| Terrarium (`s3.amazonaws.com/elevation-tiles-prod`) | GET | 200 | `*` (métodos: GET) |
| Terrarium | HEAD | 200 | ausente (la regla CORS del bucket cubre solo GET; la app usa GET) |
| Terrarium | OPTIONS (preflight) | 200 | `*` |
| Terrarium | `fetch()` en navegador | 200, 38 032 bytes | — |

### Conclusiones
- **Terrarium funciona desde el navegador.** Flujo probado en producción (Temuco): curvas, metadatos y advertencias OK.
- **Copernicus NO funciona desde el navegador.** El bucket entrega los bytes (curl recibe 206), pero no tiene CORS
  habilitado y el navegador bloquea la respuesta. No depende del origen ni del endpoint; falla igual en `localhost`.
  No es un problema del despliegue.
- La app falla con gracia: `loadDem` muestra «No se pudo cargar el terreno (copernicus). Failed to fetch. Prueba otra
  fuente…». Pero Copernicus es la fuente **por defecto** (`App.tsx`), así que el primer intento del estudiante falla.

### Decisión (Chris)
- Publicar tal cual y solo documentar. Quedan por decidir:
  - Cambiar la fuente por defecto a Terrarium.
  - Proxy liviano para Copernicus (p. ej. Cloudflare Worker que reenvíe `Range` y agregue CORS). Por la regla 4 de
    `CLAUDE.md`, se documenta aquí antes de implementarlo.

### Pendientes abiertos
- Decidir fuente por defecto y proxy de Copernicus (arriba).
- Actualizar la nota de CORS en `CLAUDE.md` (Trampas conocidas) y el estado del paso 2 en `SPEC.md`.
- Chris: fijar valores OGUC verificados.
