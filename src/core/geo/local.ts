import proj4 from 'proj4'

export interface LonLat {
  lon: number
  lat: number
}

export interface XY {
  x: number
  y: number
}

export interface XYZ extends XY {
  z: number
}

/** Huso UTM (1–60) para una longitud. Sin excepciones de Noruega/Svalbard: irrelevantes para este uso. */
export function utmZone(lon: number): number {
  const z = Math.floor((lon + 180) / 6) + 1
  return Math.min(60, Math.max(1, z))
}

export function utmEpsg(lon: number, lat: number): number {
  return (lat < 0 ? 32700 : 32600) + utmZone(lon)
}

function utmProjString(zone: number, south: boolean): string {
  return `+proj=utm +zone=${zone}${south ? ' +south' : ''} +datum=WGS84 +units=m +no_defs`
}

/**
 * Marco métrico local del sitio.
 * - Proyección: UTM WGS84 del huso que contiene el origen (elegido automáticamente, sirve en cualquier parte del mundo).
 * - Coordenadas locales: (x, y) = (Este − E0, Norte − N0) en metros. y crece hacia el norte de cuadrícula.
 * Todo el cálculo geométrico de la app ocurre en este marco; lon/lat solo se usan en los bordes (mapa, DEM).
 */
export interface LocalFrame {
  origin: LonLat
  zone: number
  south: boolean
  epsg: number
  originE: number
  originN: number
  toLocal(p: LonLat): XY
  toLonLat(p: XY): LonLat
  /** Coordenadas UTM absolutas (para exportar a CAD georreferenciado). */
  toUTM(p: XY): XY
}

export function createLocalFrame(origin: LonLat): LocalFrame {
  const zone = utmZone(origin.lon)
  const south = origin.lat < 0
  const conv = proj4('WGS84', utmProjString(zone, south))
  const [originE, originN] = conv.forward([origin.lon, origin.lat])
  return {
    origin,
    zone,
    south,
    epsg: utmEpsg(origin.lon, origin.lat),
    originE,
    originN,
    toLocal(p) {
      const [e, n] = conv.forward([p.lon, p.lat])
      return { x: e - originE, y: n - originN }
    },
    toLonLat(p) {
      const [lon, lat] = conv.inverse([p.x + originE, p.y + originN])
      return { lon, lat }
    },
    toUTM(p) {
      return { x: p.x + originE, y: p.y + originN }
    },
  }
}
