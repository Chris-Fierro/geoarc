# GEO·ARC

Envolvente normativa sobre terreno real — herramienta docente de META|Lab, Universidad Autónoma de Chile.

Sitio real (cualquier parte del mundo) → terreno → curvas de nivel → lote → norma → envolvente 3D → DXF georreferenciado.

## Uso local

```bash
npm install
npm run dev
```

Abre la URL que indica la consola. Para clases sin conexión, elige **Ladera sintética** como fuente de elevación.

## Pruebas

```bash
npm test             # núcleo geométrico (Vitest)
npm run typecheck
npm run e2e          # flujo completo en navegador (Playwright)
```

## Publicación

Es un sitio estático (`npm run build` → `dist/`). El flujo `.github/workflows/pages.yml` lo publica en GitHub Pages
al hacer push a `main` (activar Pages → “GitHub Actions” en la configuración del repo).

## Datos y atribuciones

- Mapa: © OpenStreetMap contributors. Imagen satelital: © Esri, Maxar, Earthstar Geographics.
- Elevación: Copernicus DEM GLO-30 (© DLR e.V. / Airbus, provisto bajo el programa Copernicus); AWS Terrain Tiles (Mapzen/Tilezen, fuentes SRTM, GMTED, ETOPO1 y otras).
- Búsqueda: Nominatim / OpenStreetMap.

Resultados con fines docentes: no reemplazan un levantamiento topográfico ni el certificado de informaciones previas.

Documentación para desarrollo: `CLAUDE.md`, `SPEC.md`, `docs/decisiones.md`.
