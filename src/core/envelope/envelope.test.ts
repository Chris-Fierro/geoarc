import { computeEnvelope, evaluateAt, prepare, GOV_MAX_HEIGHT, GOV_OUTSIDE, GOV_SETBACK, type EdgeRule } from './envelope'
import { facing, outwardNormal } from './polygon'

const SQ = [
  { x: 0, y: 0 },
  { x: 20, y: 0 },
  { x: 20, y: 20 },
  { x: 0, y: 20 },
] // CCW. Lados: 0 = sur, 1 = este, 2 = norte, 3 = oeste
const T70 = Math.tan((70 * Math.PI) / 180)
const r = (o: Partial<EdgeRule> = {}): EdgeRule => ({ rasante: true, angleDeg: 70, startHeight: 0, setback: 0, originOffset: 0, ...o })
const all = (o: Partial<EdgeRule> = {}) => [r(o), r(o), r(o), r(o)]
const flat = (z = 0) => () => z
const ctx = (rules: EdgeRule[], terrain: (x: number, y: number) => number = flat(), maxHeight = Infinity, lot = SQ) =>
  prepare({ lot, rules, maxHeight, terrain, cell: 0.5 }, 0.05)

describe('envolvente — casos dorados', () => {
  it('lote plano 20×20, rasante 70° en los 4 lados: centro = 10·tan70°', () => {
    const e = evaluateAt(ctx(all()), { x: 10, y: 10 })
    expect(e.top).toBeCloseTo(10 * T70, 2)
  })

  it('la altura máxima recorta y queda registrada como restricción gobernante', () => {
    const e = evaluateAt(ctx(all(), flat(), 14), { x: 10, y: 10 })
    expect(e.top).toBeCloseTo(14, 6)
    expect(e.governing).toBe(GOV_MAX_HEIGHT)
  })

  it('terreno plano a cota 100: la envolvente se traslada completa', () => {
    const e = evaluateAt(ctx(all(), flat(100)), { x: 10, y: 10 })
    expect(e.top).toBeCloseTo(100 + 10 * T70, 2)
  })

  it('en pendiente, la rasante arranca de la cota natural del deslinde (no del punto)', () => {
    // terreno sube 10 % hacia el este; solo el lado oeste (x=0, cota 0) tiene rasante
    const rules = [r({ rasante: false }), r({ rasante: false }), r({ rasante: false }), r()]
    const e = evaluateAt(ctx(rules, (x: number) => 0.1 * x), { x: 10, y: 10 })
    expect(e.top).toBeCloseTo(10 * T70, 2)
    expect(e.ground).toBeCloseTo(1, 6)
    expect(e.governing).toBe(3)
  })

  it('lado gobernante = el más cercano en terreno plano', () => {
    expect(evaluateAt(ctx(all()), { x: 10, y: 2 }).governing).toBe(0) // sur
    expect(evaluateAt(ctx(all()), { x: 18, y: 10 }).governing).toBe(1) // este
  })

  it('distanciamiento: franja no edificable junto al deslinde', () => {
    const c = ctx(all({ setback: 3 }))
    expect(evaluateAt(c, { x: 2, y: 10 }).governing).toBe(GOV_SETBACK)
    expect(evaluateAt(c, { x: 5, y: 10 }).top).toBeCloseTo(5 * T70, 2)
  })

  it('frente a calle: la rasante se traza desde el eje (originOffset hacia afuera)', () => {
    const rules = [r({ rasante: false }), r({ rasante: false }), r({ rasante: false }), r({ originOffset: 5 })]
    expect(evaluateAt(ctx(rules), { x: 10, y: 10 }).top).toBeCloseTo(15 * T70, 2)
  })

  it('el sentido del polígono no altera el resultado (CW = CCW)', () => {
    const cw = [...SQ].reverse()
    // en CW el lado 0 va de (0,20) a (20,20): es el norte. Solo ese con rasante y offset 5 hacia afuera (norte).
    const rules = [r({ originOffset: 5 }), r({ rasante: false }), r({ rasante: false }), r({ rasante: false })]
    const e = evaluateAt(ctx(rules, flat(), Infinity, cw), { x: 10, y: 10 })
    expect(e.top).toBeCloseTo(15 * T70, 2)
  })

  it('fuera del lote → sin envolvente', () => {
    expect(evaluateAt(ctx(all()), { x: 25, y: 10 }).governing).toBe(GOV_OUTSIDE)
  })

  it('volumen: caja de 20×20×3 con rasante casi vertical ≈ 1200 m³', () => {
    const res = computeEnvelope({ lot: SQ, rules: all({ angleDeg: 89.9 }), maxHeight: 3, terrain: flat(), cell: 0.5 })
    expect(res.stats.lotArea).toBe(400)
    expect(res.stats.volume).toBeGreaterThan(1200 * 0.98)
    expect(res.stats.volume).toBeLessThan(1200 * 1.001)
    expect(res.stats.maxRel).toBeCloseTo(3, 6)
  })

  it('rumbo de cada lado según normal exterior', () => {
    expect(facing(outwardNormal(SQ[0], SQ[1]))).toBe('S')
    expect(facing(outwardNormal(SQ[1], SQ[2]))).toBe('E')
    expect(facing(outwardNormal(SQ[2], SQ[3]))).toBe('N')
    expect(facing(outwardNormal(SQ[3], SQ[0]))).toBe('O')
  })
})
