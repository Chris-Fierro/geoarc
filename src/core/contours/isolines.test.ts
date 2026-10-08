import { createGrid } from '../dem/grid'
import { contourLevels, isolines } from './isolines'

const meta = { source: 't', kind: 'sintético' as const, nominalResolutionM: 1 }

describe('curvas de nivel', () => {
  it('niveles múltiplos del intervalo', () => {
    expect(contourLevels(101.3, 104.9, 1)).toEqual([102, 103, 104])
    expect(contourLevels(0, 1, 0.5)).toEqual([0, 0.5, 1])
  })

  it('plano inclinado → una recta abierta en la cota exacta', () => {
    const g = createGrid(11, 11, 1, 0, 0, meta, (x) => x)
    const ls = isolines(g, [5.5])
    expect(ls).toHaveLength(1)
    expect(ls[0].closed).toBe(false)
    for (const p of ls[0].points) expect(p.x).toBeCloseTo(5.5, 9)
    const ys = ls[0].points.map((p) => p.y).sort((a, b) => a - b)
    expect(ys[0]).toBe(0)
    expect(ys[ys.length - 1]).toBe(10)
  })

  it('cono → un anillo cerrado de radio ≈ nivel', () => {
    const g = createGrid(41, 41, 0.5, -10, -10, meta, (x, y) => Math.hypot(x, y))
    const ls = isolines(g, [3])
    expect(ls).toHaveLength(1)
    expect(ls[0].closed).toBe(true)
    for (const p of ls[0].points) expect(Math.abs(Math.hypot(p.x, p.y) - 3)).toBeLessThan(0.05)
  })

  it('dos cerros → dos anillos (silla resuelta sin cruces)', () => {
    const g = createGrid(61, 31, 0.5, -15, -7.5, meta, (x, y) =>
      Math.exp(-((x + 6) ** 2 + y ** 2) / 8) + Math.exp(-((x - 6) ** 2 + y ** 2) / 8),
    )
    const ls = isolines(g, [0.5])
    expect(ls).toHaveLength(2)
    expect(ls.every((l) => l.closed)).toBe(true)
  })
})
