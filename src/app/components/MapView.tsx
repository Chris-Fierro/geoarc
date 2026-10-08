import { useEffect, useRef, useState } from 'react'
import { Map as MlMap, Marker, NavigationControl, ScaleControl, setWorkerUrl, type GeoJSONSource, type MapMouseEvent, type StyleSpecification } from 'maplibre-gl'
import type { Feature, FeatureCollection } from 'geojson'
// MapLibre v6 carga su worker como módulo aparte: Vite debe empaquetarlo y entregar su URL.
import maplibreWorkerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url'
setWorkerUrl(maplibreWorkerUrl)
import type { LocalFrame, LonLat, XY } from '../../core/geo/local'
import type { Isoline } from '../../core/contours/isolines'
import { edgeColor, type MapMode } from '../model'

const STYLE: StyleSpecification = {
  version: 8,
  sources: {
    osm: {
      type: 'raster',
      tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
      tileSize: 256,
      maxzoom: 19,
      attribution: '© OpenStreetMap contributors',
    },
    sat: {
      type: 'raster',
      tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'],
      tileSize: 256,
      maxzoom: 19,
      attribution: 'Imágenes © Esri, Maxar, Earthstar Geographics',
    },
  },
  layers: [
    { id: 'osm', type: 'raster', source: 'osm' },
    { id: 'sat', type: 'raster', source: 'sat', layout: { visibility: 'none' } },
  ],
}

type FC = FeatureCollection
const empty: FC = { type: 'FeatureCollection', features: [] }

interface Props {
  frame: LocalFrame
  site: LonLat
  areaSize: number
  contours: Isoline[]
  indexInterval: number
  lot: XY[]
  draft: XY[]
  mode: MapMode
  onPick: (p: LonLat) => void
  onFinishLot: () => void
  visible: boolean
}

export function MapView(p: Props) {
  const el = useRef<HTMLDivElement>(null)
  const map = useRef<MlMap | null>(null)
  const marker = useRef<Marker | null>(null)
  const [ready, setReady] = useState(false)
  const [basemap, setBasemap] = useState<'osm' | 'sat'>('osm')
  const cb = useRef(p)
  cb.current = p

  useEffect(() => {
    if (!el.current) return
    const m = new MlMap({
      container: el.current,
      style: STYLE,
      center: [p.site.lon, p.site.lat],
      zoom: 17,
      attributionControl: { compact: true },
    })
    m.addControl(new NavigationControl({ visualizePitch: false }), 'top-right')
    m.addControl(new ScaleControl({ unit: 'metric' }), 'bottom-left')
    m.on('load', () => {
      m.addSource('area', { type: 'geojson', data: empty })
      m.addSource('contours', { type: 'geojson', data: empty })
      m.addSource('lot', { type: 'geojson', data: empty })
      m.addSource('draft', { type: 'geojson', data: empty })
      m.addLayer({ id: 'area', type: 'line', source: 'area', paint: { 'line-color': '#334155', 'line-dasharray': [2, 2], 'line-width': 1 } })
      m.addLayer({
        id: 'contours',
        type: 'line',
        source: 'contours',
        paint: {
          'line-color': '#8b4513',
          'line-width': ['case', ['get', 'index'], 1.6, 0.6],
          'line-opacity': 0.85,
        },
      })
      m.addLayer({
        id: 'contour-labels',
        type: 'symbol',
        source: 'contours',
        filter: ['get', 'index'],
        layout: { 'symbol-placement': 'line', 'text-field': ['get', 'label'], 'text-size': 10 },
        paint: { 'text-color': '#5b2c0a', 'text-halo-color': '#fff', 'text-halo-width': 1.2 },
      })
      m.addLayer({ id: 'lot-fill', type: 'fill', source: 'lot', filter: ['==', '$type', 'Polygon'], paint: { 'fill-color': '#0ea5e9', 'fill-opacity': 0.12 } })
      m.addLayer({ id: 'lot-edges', type: 'line', source: 'lot', filter: ['==', '$type', 'LineString'], paint: { 'line-color': ['get', 'color'], 'line-width': 3.5 } })
      m.addLayer({ id: 'draft-line', type: 'line', source: 'draft', paint: { 'line-color': '#0ea5e9', 'line-width': 2, 'line-dasharray': [1, 1] } })
      m.addLayer({ id: 'draft-pts', type: 'circle', source: 'draft', filter: ['==', '$type', 'Point'], paint: { 'circle-radius': 4, 'circle-color': '#0ea5e9', 'circle-stroke-color': '#fff', 'circle-stroke-width': 1.5 } })
      setReady(true)
    })
    m.on('click', (e: MapMouseEvent) => {
      const mode = cb.current.mode
      if (mode !== 'none') cb.current.onPick({ lon: e.lngLat.lng, lat: e.lngLat.lat })
    })
    m.on('dblclick', (e: MapMouseEvent) => {
      if (cb.current.mode === 'lot') {
        e.preventDefault()
        cb.current.onFinishLot()
      }
    })
    map.current = m
    marker.current = new Marker({ color: '#0f172a' }).setLngLat([p.site.lon, p.site.lat]).addTo(m)
    return () => m.remove()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // redimensionar al volver visible
  useEffect(() => {
    if (p.visible) map.current?.resize()
  }, [p.visible])

  useEffect(() => {
    const m = map.current
    if (!m) return
    marker.current?.setLngLat([p.site.lon, p.site.lat])
    if (p.mode !== 'lot') m.easeTo({ center: [p.site.lon, p.site.lat] })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [p.site.lon, p.site.lat])

  useEffect(() => {
    const m = map.current
    if (!m || !ready) return
    m.getCanvas().style.cursor = p.mode === 'none' ? '' : 'crosshair'
    if (p.mode === 'lot') m.doubleClickZoom.disable()
    else m.doubleClickZoom.enable()
  }, [p.mode, ready])

  useEffect(() => {
    const m = map.current
    if (!m || !ready) return
    m.setLayoutProperty('sat', 'visibility', basemap === 'sat' ? 'visible' : 'none')
    m.setLayoutProperty('osm', 'visibility', basemap === 'osm' ? 'visible' : 'none')
  }, [basemap, ready])

  useEffect(() => {
    const m = map.current
    if (!m || !ready) return
    const ll = (q: XY) => {
      const g = p.frame.toLonLat(q)
      return [g.lon, g.lat]
    }
    const h = p.areaSize / 2
    ;(m.getSource('area') as GeoJSONSource).setData({
      type: 'Feature',
      properties: {},
      geometry: { type: 'LineString', coordinates: [ll({ x: -h, y: -h }), ll({ x: h, y: -h }), ll({ x: h, y: h }), ll({ x: -h, y: h }), ll({ x: -h, y: -h })] },
    })
    ;(m.getSource('contours') as GeoJSONSource).setData({
      type: 'FeatureCollection',
      features: p.contours.map((c) => {
        const isIndex = Math.abs(c.level / p.indexInterval - Math.round(c.level / p.indexInterval)) < 1e-6
        const coords = c.points.map(ll)
        if (c.closed && coords.length) coords.push(coords[0])
        return {
          type: 'Feature',
          properties: { level: c.level, index: isIndex, label: `${Math.round(c.level * 10) / 10} m` },
          geometry: { type: 'LineString', coordinates: coords },
        }
      }),
    })
    const lotFeatures: Feature[] = []
    if (p.lot.length > 2) {
      lotFeatures.push({ type: 'Feature', properties: {}, geometry: { type: 'Polygon', coordinates: [[...p.lot.map(ll), ll(p.lot[0])]] } })
      p.lot.forEach((a, k) => {
        const b = p.lot[(k + 1) % p.lot.length]
        lotFeatures.push({ type: 'Feature', properties: { color: edgeColor(k) }, geometry: { type: 'LineString', coordinates: [ll(a), ll(b)] } })
      })
    }
    ;(m.getSource('lot') as GeoJSONSource).setData({ type: 'FeatureCollection', features: lotFeatures })
    const dr: Feature[] = p.draft.map((q) => ({ type: 'Feature', properties: {}, geometry: { type: 'Point', coordinates: ll(q) } }))
    if (p.draft.length > 1) dr.push({ type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: p.draft.map(ll) } })
    ;(m.getSource('draft') as GeoJSONSource).setData({ type: 'FeatureCollection', features: dr })
  }, [p.frame, p.areaSize, p.contours, p.indexInterval, p.lot, p.draft, ready])

  return (
    <div className="absolute inset-0">
      {/* estilo en línea: la hoja de MapLibre fuerza position: relative en .maplibregl-map */}
      <div ref={el} style={{ position: "absolute", inset: 0 }} data-testid="map" />
      <div className="absolute left-2 top-2 flex overflow-hidden rounded-md border border-slate-300 bg-white text-xs shadow">
        {(['osm', 'sat'] as const).map((b) => (
          <button
            key={b}
            onClick={() => setBasemap(b)}
            className={`px-2 py-1 ${basemap === b ? 'bg-slate-800 text-white' : 'text-slate-700 hover:bg-slate-100'}`}
          >
            {b === 'osm' ? 'Mapa' : 'Satélite'}
          </button>
        ))}
      </div>
      {p.mode !== 'none' && (
        <div className="pointer-events-none absolute left-1/2 top-2 -translate-x-1/2 rounded-md bg-sky-600 px-3 py-1 text-xs text-white shadow">
          {p.mode === 'site' ? 'Haz clic en el mapa para fijar el sitio' : 'Clic: agregar vértice · Doble clic: cerrar lote'}
        </div>
      )}
    </div>
  )
}
