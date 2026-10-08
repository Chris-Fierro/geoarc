import type { LocalFrame, LonLat } from '../geo/local'
import { centeredGrid, type DemMeta, type HeightGrid } from './grid'

/** Función que entrega elevación (m) para una posición geográfica; NaN si no hay dato. */
export type GeoSampler = (p: LonLat) => number

/**
 * Remuestrea una fuente geográfica (lon/lat) a una grilla métrica local centrada en el origen del marco.
 * Cada celda local se proyecta inversamente a lon/lat y se muestrea la fuente ahí.
 */
export function resampleToLocal(
  frame: LocalFrame,
  sampler: GeoSampler,
  size: number,
  cell: number,
  meta: DemMeta,
): HeightGrid {
  return centeredGrid(size, cell, meta, (x, y) => sampler(frame.toLonLat({ x, y })))
}

/** Caja geográfica que cubre un cuadrado local de lado `size` centrado en el origen (con margen). */
export function localSquareBBox(frame: LocalFrame, size: number, marginM = 60) {
  const h = size / 2 + marginM
  const corners = [
    frame.toLonLat({ x: -h, y: -h }),
    frame.toLonLat({ x: h, y: -h }),
    frame.toLonLat({ x: h, y: h }),
    frame.toLonLat({ x: -h, y: h }),
  ]
  return {
    west: Math.min(...corners.map((c) => c.lon)),
    east: Math.max(...corners.map((c) => c.lon)),
    south: Math.min(...corners.map((c) => c.lat)),
    north: Math.max(...corners.map((c) => c.lat)),
  }
}

export type BBox = ReturnType<typeof localSquareBBox>

/**
 * Muestreador bilineal sobre un raster geográfico regular.
 * `lon0/lat0` = coordenada del CENTRO del píxel (0,0); fila 0 es la más al norte; `dLat` es positivo.
 */
export function rasterSampler(
  data: ArrayLike<number>,
  width: number,
  height: number,
  lon0: number,
  lat0: number,
  dLon: number,
  dLat: number,
  noData?: number,
): GeoSampler {
  return ({ lon, lat }) => {
    const fx = (lon - lon0) / dLon
    const fy = (lat0 - lat) / dLat
    if (fx < 0 || fy < 0 || fx > width - 1 || fy > height - 1) return NaN
    const i = Math.min(Math.floor(fx), width - 2)
    const j = Math.min(Math.floor(fy), height - 2)
    const tx = fx - i
    const ty = fy - j
    const a = data[j * width + i]
    const b = data[j * width + i + 1]
    const c = data[(j + 1) * width + i]
    const d = data[(j + 1) * width + i + 1]
    if (noData !== undefined && (a === noData || b === noData || c === noData || d === noData)) return NaN
    return (a * (1 - tx) + b * tx) * (1 - ty) + (c * (1 - tx) + d * tx) * ty
  }
}
