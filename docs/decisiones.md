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
- Chris: fijar valores OGUC verificados.
