import type { LocalFrame, LonLat } from '../geo/local'
import type { HeightGrid } from './grid'
import { localSquareBBox, resampleToLocal, type GeoSampler } from './resample'

/**
 * Terrarium (AWS Terrain Tiles / Mapzen). Global, PNG RGB.
 * En Chile el dato subyacente es esencialmente SRTM (~30 m), aunque el zoom 15 tenga píxeles de ~4 m.
 */
export const TERRARIUM_URL = 'https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png'

export function decodeTerrarium(r: number, g: number, b: number): number {
  return r * 256 + g + b / 256 - 32768
}

/** Coordenada de tesela (fraccionaria) Web Mercator. */
export function lonLatToTile(p: LonLat, z: number): { x: number; y: number } {
  const n = 2 ** z
  const x = ((p.lon + 180) / 360) * n
  const latRad = (p.lat * Math.PI) / 180
  const y = ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n
  return { x, y }
}

async function loadTileRGBA(z: number, x: number, y: number): Promise<Uint8ClampedArray> {
  const url = TERRARIUM_URL.replace('{z}', String(z)).replace('{x}', String(x)).replace('{y}', String(y))
  const res = await fetch(url, { mode: 'cors' })
  if (!res.ok) throw new Error(`Terrarium ${res.status} en ${url}`)
  const bmp = await createImageBitmap(await res.blob())
  const canvas = new OffscreenCanvas(bmp.width, bmp.height)
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  if (!ctx) throw new Error('Canvas 2D no disponible')
  ctx.drawImage(bmp, 0, 0)
  return ctx.getImageData(0, 0, bmp.width, bmp.height).data
}

/** Carga Terrarium para el cuadrado local y lo remuestrea a la grilla métrica. Solo navegador. */
export async function loadTerrariumGrid(
  frame: LocalFrame,
  size: number,
  cell: number,
  zoom = 14,
): Promise<HeightGrid> {
  const bb = localSquareBBox(frame, size)
  const tl = lonLatToTile({ lon: bb.west, lat: bb.north }, zoom)
  const br = lonLatToTile({ lon: bb.east, lat: bb.south }, zoom)
  const tx0 = Math.floor(tl.x)
  const ty0 = Math.floor(tl.y)
  const tx1 = Math.floor(br.x)
  const ty1 = Math.floor(br.y)
  const tiles = new Map<string, Uint8ClampedArray>()
  const jobs: Promise<void>[] = []
  for (let tx = tx0; tx <= tx1; tx++)
    for (let ty = ty0; ty <= ty1; ty++)
      jobs.push(loadTileRGBA(zoom, tx, ty).then((d) => void tiles.set(`${tx}/${ty}`, d)))
  await Promise.all(jobs)

  /** Elevación del píxel global (i, j) del mosaico al zoom dado. */
  const val = (i: number, j: number): number => {
    const tx = Math.floor(i / 256)
    const ty = Math.floor(j / 256)
    const d = tiles.get(`${tx}/${ty}`)
    if (!d) return NaN
    const k = ((j - ty * 256) * 256 + (i - tx * 256)) * 4
    return decodeTerrarium(d[k], d[k + 1], d[k + 2])
  }

  const sampler: GeoSampler = (p) => {
    const t = lonLatToTile(p, zoom)
    // el valor de cada píxel corresponde a su centro
    const gx = t.x * 256 - 0.5
    const gy = t.y * 256 - 0.5
    const i0 = Math.floor(gx)
    const j0 = Math.floor(gy)
    const fx = gx - i0
    const fy = gy - j0
    const a = val(i0, j0)
    const b = val(i0 + 1, j0)
    const c = val(i0, j0 + 1)
    const d = val(i0 + 1, j0 + 1)
    return (a * (1 - fx) + b * fx) * (1 - fy) + (c * (1 - fx) + d * fx) * fy
  }

  return resampleToLocal(frame, sampler, size, cell, {
    source: 'Terrarium (AWS Terrain Tiles)',
    kind: 'DSM',
    nominalResolutionM: 30,
    notes: 'En Chile ≈ SRTM 1″ (~30 m). Mezcla de fuentes; sin actualización activa. Uso referencial.',
  })
}
