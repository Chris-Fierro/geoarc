import type { LocalFrame } from '../core/geo/local'
import type { HeightGrid } from '../core/dem/grid'
import { loadCopernicusGrid } from '../core/dem/copernicus'
import { loadTerrariumGrid } from '../core/dem/terrarium'
import { syntheticHillside } from '../core/dem/synthetic'
import type { DemSourceId } from './model'

export async function loadDem(src: DemSourceId, frame: LocalFrame, size: number, cell: number): Promise<HeightGrid> {
  try {
    switch (src) {
      case 'copernicus':
        return await loadCopernicusGrid(frame, size, cell)
      case 'terrarium':
        return await loadTerrariumGrid(frame, size, cell)
      default:
        return syntheticHillside(size, cell)
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    throw new Error(
      `No se pudo cargar el terreno (${src}). ${msg}. ` +
        'Prueba otra fuente; si persiste, puede ser un bloqueo CORS o de red.',
    )
  }
}
