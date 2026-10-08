import type { LocalFrame, XY } from '../geo/local'
import type { Isoline } from '../contours/isolines'
import type { EnvelopeResult } from '../envelope/envelope'
import { DxfWriter } from './dxf'

export interface SceneForDxf {
  frame: LocalFrame
  contours: Isoline[]
  /** Curvas maestras cada este intervalo (m). */
  indexInterval: number
  lot?: XY[]
  lotZ?: (p: XY) => number
  envelope?: EnvelopeResult
}

/**
 * DXF georreferenciado en UTM (huso del sitio, WGS84), metros.
 * Capas: CURVAS, CURVAS_MAESTRAS, LOTE, ENVOLVENTE (malla 3DFACE).
 */
export function sceneToDxf(s: SceneForDxf): string {
  const w = new DxfWriter()
    .addLayer('CURVAS', 8)
    .addLayer('CURVAS_MAESTRAS', 7)
    .addLayer('LOTE', 1)
    .addLayer('ENVOLVENTE', 5)
  const U = (p: XY, z: number) => ({ ...s.frame.toUTM(p), z })

  for (const c of s.contours) {
    const isIndex = Math.abs(c.level / s.indexInterval - Math.round(c.level / s.indexInterval)) < 1e-6
    w.polyline3d(isIndex ? 'CURVAS_MAESTRAS' : 'CURVAS', c.points.map((p) => U(p, c.level)), c.closed)
  }

  if (s.lot && s.lot.length > 2) w.polyline3d('LOTE', s.lot.map((p) => U(p, s.lotZ ? s.lotZ(p) : 0)), true)

  const e = s.envelope
  if (e) {
    const h = e.cell / 2
    for (let j = 0; j < e.ny; j++)
      for (let i = 0; i < e.nx; i++) {
        const k = j * e.nx + i
        const t = e.top[k]
        if (Number.isNaN(t) || !(e.rel[k] > 0)) continue
        const cx = e.x0 + i * e.cell
        const cy = e.y0 + j * e.cell
        w.face3d(
          'ENVOLVENTE',
          U({ x: cx - h, y: cy - h }, t),
          U({ x: cx + h, y: cy - h }, t),
          U({ x: cx + h, y: cy + h }, t),
          U({ x: cx - h, y: cy + h }, t),
        )
      }
  }
  return w.toString()
}
