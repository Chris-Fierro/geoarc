import type { EdgeRule } from '../envelope/envelope'

/**
 * Perfiles normativos. ÚNICO lugar donde viven valores normativos por defecto.
 *
 * REGLA: ningún valor normativo se infiere ni se "recuerda". Cada valor se marca `verificado: true`
 * solo cuando el responsable normativo (Chris) lo confirma contra el texto vigente, y se agrega
 * un test en perfiles.test.ts que lo fije. Mientras `verificado` sea false, la UI muestra advertencia.
 */
export type EdgeRole = 'deslinde' | 'frente' | 'libre'

export interface ValorNormativo<T> {
  valor: T
  verificado: boolean
  fuente: string
}

export interface PerfilNormativo {
  id: 'oguc' | 'personalizado'
  nombre: string
  descripcion: string
  anguloRasante: ValorNormativo<number>
  alturaArranque: ValorNormativo<number>
  distanciamiento: ValorNormativo<number>
  alturaMaxima: ValorNormativo<number>
  /** Distancia por defecto de la línea oficial al eje de la calzada, para lados tipo "frente". */
  ejeCalle: ValorNormativo<number>
}

export const PERFIL_OGUC: PerfilNormativo = {
  id: 'oguc',
  nombre: 'OGUC Chile',
  descripcion:
    'Rasantes y distanciamientos según OGUC (Art. 2.6.3 y siguientes) y altura máxima del Plan Regulador Comunal. ' +
    'El ángulo de rasante depende de la región; el grupo regional y los valores deben fijarse contra el texto vigente.',
  anguloRasante: { valor: 70, verificado: false, fuente: 'OGUC Art. 2.6.3 — tabla por regiones (POR VERIFICAR)' },
  alturaArranque: { valor: 0, verificado: false, fuente: 'OGUC Art. 2.6.3 (POR VERIFICAR; el handoff v1.2 indicaba 2,5 m)' },
  distanciamiento: { valor: 0, verificado: false, fuente: 'OGUC Art. 2.6.3 / PRC (POR VERIFICAR)' },
  alturaMaxima: { valor: 14, verificado: false, fuente: 'Plan Regulador Comunal de la zona (valor de ejemplo)' },
  ejeCalle: { valor: 7.5, verificado: false, fuente: 'Perfil de la vía según PRC (valor de ejemplo)' },
}

export const PERFIL_PERSONALIZADO: PerfilNormativo = {
  id: 'personalizado',
  nombre: 'Personalizado',
  descripcion: 'Parámetros libres, para sitios fuera de Chile o ejercicios de exploración.',
  anguloRasante: { valor: 60, verificado: true, fuente: 'Definido por el usuario' },
  alturaArranque: { valor: 0, verificado: true, fuente: 'Definido por el usuario' },
  distanciamiento: { valor: 3, verificado: true, fuente: 'Definido por el usuario' },
  alturaMaxima: { valor: 12, verificado: true, fuente: 'Definido por el usuario' },
  ejeCalle: { valor: 6, verificado: true, fuente: 'Definido por el usuario' },
}

export const PERFILES = [PERFIL_OGUC, PERFIL_PERSONALIZADO]

export function perfilVerificado(p: PerfilNormativo): boolean {
  return [p.anguloRasante, p.alturaArranque, p.distanciamiento, p.alturaMaxima, p.ejeCalle].every((v) => v.verificado)
}

/** Regla de un lado a partir del perfil y su rol. */
export function reglaPorRol(p: PerfilNormativo, rol: EdgeRole): EdgeRule {
  return {
    rasante: rol !== 'libre',
    angleDeg: p.anguloRasante.valor,
    startHeight: p.alturaArranque.valor,
    setback: rol === 'deslinde' ? p.distanciamiento.valor : 0,
    originOffset: rol === 'frente' ? p.ejeCalle.valor : 0,
  }
}
