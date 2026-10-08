import { DxfWriter } from './dxf'
import { sceneToDxf } from './sceneDxf'
import { createLocalFrame } from '../geo/local'

describe('DXF R12', () => {
  it('estructura válida con capas y entidades', () => {
    const s = new DxfWriter()
      .addLayer('curvas', 8)
      .polyline3d('curvas', [{ x: 0, y: 0, z: 1 }, { x: 1, y: 0, z: 1 }], false)
      .face3d('curvas', { x: 0, y: 0, z: 0 }, { x: 1, y: 0, z: 0 }, { x: 1, y: 1, z: 0 })
      .toString()
    expect(s).toContain('AC1009')
    expect(s).toContain('\nCURVAS\n')
    expect(s.match(/\nVERTEX\n/g)).toHaveLength(2)
    expect(s).toContain('3DFACE')
    expect(s.trim().endsWith('EOF')).toBe(true)
  })

  it('exporta en UTM absolutas y separa curvas maestras', () => {
    const frame = createLocalFrame({ lon: -72.598, lat: -38.739 })
    const s = sceneToDxf({
      frame,
      indexInterval: 5,
      contours: [
        { level: 100, closed: false, points: [{ x: 0, y: 0 }, { x: 10, y: 0 }] },
        { level: 101, closed: false, points: [{ x: 0, y: 1 }, { x: 10, y: 1 }] },
      ],
    })
    expect(s).toContain('CURVAS_MAESTRAS')
    expect(s).toContain(frame.originE.toFixed(3))
  })
})
