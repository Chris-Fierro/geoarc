import { createLocalFrame, utmEpsg, utmZone } from './local'

describe('marco local UTM', () => {
  it('elige el huso según la longitud (Temuco → 18S, EPSG 32718)', () => {
    expect(utmZone(-72.6)).toBe(18)
    expect(utmEpsg(-72.6, -38.7)).toBe(32718)
    expect(utmEpsg(-70.6, -33.4)).toBe(32719) // Santiago
    expect(utmEpsg(2.17, 41.38)).toBe(32631) // Barcelona
  })

  it('el origen es (0,0) y la ida y vuelta lon/lat es exacta', () => {
    const f = createLocalFrame({ lon: -72.598, lat: -38.739 })
    const o = f.toLocal(f.origin)
    expect(Math.abs(o.x)).toBeLessThan(1e-6)
    expect(Math.abs(o.y)).toBeLessThan(1e-6)
    const p = f.toLonLat({ x: 123.4, y: -56.7 })
    const back = f.toLocal(p)
    expect(back.x).toBeCloseTo(123.4, 5)
    expect(back.y).toBeCloseTo(-56.7, 5)
  })

  it('las distancias locales son métricas (100 m al norte ≈ 0,0009° de latitud)', () => {
    const f = createLocalFrame({ lon: -72.598, lat: -38.739 })
    const p = f.toLonLat({ x: 0, y: 100 })
    expect((p.lat - f.origin.lat) * 111_000).toBeGreaterThan(99)
    expect((p.lat - f.origin.lat) * 111_000).toBeLessThan(101)
  })
})
