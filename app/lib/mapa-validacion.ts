/**
 * Validación de los parámetros del endpoint /api/mapa.
 * Se separa de la ruta para poder probarla sin tocar la base de datos.
 */
import type { Nivel } from "./geo-config";

// Longitud del código (prefijo del ubigeo) que identifica cada nivel
export const LEN_NIVEL: Record<Nivel, number> = {
  departamento: 2,
  provincia: 4,
  distrito: 6,
};

// Longitud del código del "padre" necesario para filtrar cada nivel
export const LEN_PADRE: Record<Nivel, number> = {
  departamento: 0,
  provincia: 2,
  distrito: 4,
};

export type ResultadoValidacion =
  | { ok: true; nivel: Nivel; lenNivel: number; lenPadre: number }
  | { ok: false; error: string };

/**
 * Valida el nivel y el código padre recibidos por querystring.
 *   - nivel debe ser departamento | provincia | distrito
 *   - padre solo puede contener dígitos
 *   - provincia requiere un padre de 2 dígitos; distrito, de 4
 */
export function validarParametrosMapa(
  nivel: string,
  padre: string
): ResultadoValidacion {
  if (!(nivel in LEN_NIVEL)) {
    return { ok: false, error: "nivel inválido" };
  }
  if (padre && !/^\d+$/.test(padre)) {
    return { ok: false, error: "padre inválido" };
  }

  const n = nivel as Nivel;
  const lenNivel = LEN_NIVEL[n];
  const lenPadre = LEN_PADRE[n];

  if (lenPadre > 0 && padre.length !== lenPadre) {
    return {
      ok: false,
      error: `el nivel '${nivel}' requiere un 'padre' de ${lenPadre} dígitos`,
    };
  }

  return { ok: true, nivel: n, lenNivel, lenPadre };
}
