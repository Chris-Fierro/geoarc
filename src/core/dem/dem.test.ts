import { createGrid, sampleBilinear, gridStats } from './grid'
import { decodeTerrarium, lonLatToTile } from './terrarium'
import { copernicusTileName } from './copernicus'
import { rasterSampler } from './resample'
import { syntheticHillside } from './synthetic'

const meta = { source: 't', kind: 'sintético' as const, nominalResolutionM: 1 }

describe('grilla de elevación', () => {
  it('interpola un plano exactamente', () => {
    const g = createGrid(11, 11, 1, 0, 0, meta, (x, y) => 2 * x + 3 * y + 10)
    expect(sampleBilinear(g, 3.25, 7.5)).toBeCloseTo(2 * 3.25 + 3 * 7.5 + 10, 6)
    expect(sampleBilinear(g, 10, 10)).toBeCloseTo(60, 6)
    expect(Number.isNaN(sampleBilinear(g, -0.1, 5))).toBe(true)
    expect(gridStats(g)).toEqual({ min: 10, max: 60 })
  })

  it('la ladera sintética es determinista y desciende al norte', () => {
    const g = syntheticHillside(200, 2)
    expect(sampleBilinear(g, -60, -80)).toBeGreaterThan(sampleBilinear(g, -60, 80))
    expect(syntheticHillside(200, 2).z).toEqual(g.z)
  })
})

describe('fuentes DEM', () => {
  it('decodifica Terrarium', () => {
    expect(decodeTerrarium(128, 0, 0)).toBe(0)
    expect(decodeTerrarium(128, 100, 128)).toBeCloseTo(100.5, 6)
  })
  it('calcula teselas Web Mercator', () => {
    const t = lonLatToTile({ lon: 0, lat: 0 }, 0)
    expect(t.x).toBeCloseTo(0.5)
    expect(t.y).toBeCloseTo(0.5)
  })
  it('nombra teselas Copernicus por su esquina suroeste', () => {
    expect(copernicusTileName({ lon: -72.598, lat: -38.739 })).toBe('Copernicus_DSM_COG_10_S39_00_W073_00_DEM')
    expect(copernicusTileName({ lon: 7.2, lat: 45.5 })).toBe('Copernicus_DSM_COG_10_N45_00_E007_00_DEM')
  })
  it('muestrea un raster geográfico (fila 0 al norte)', () => {
    // 3x3, lon 0..2, lat 2..0; valor = lon + 10*lat
    const data = [20, 21, 22, 10, 11, 12, 0, 1, 2]
    const s = rasterSampler(data, 3, 3, 0, 2, 1, 1)
    expect(s({ lon: 1.5, lat: 0.5 })).toBeCloseTo(6.5, 6)
    expect(Number.isNaN(s({ lon: 3, lat: 1 }))).toBe(true)
  })
})
