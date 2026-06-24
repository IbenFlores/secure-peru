/**
 * Configuración de los 3 niveles del mapa drill-down.
 * El join entre datos (API) y polígonos (GeoJSON) se hace por CÓDIGO de ubigeo,
 * no por nombre, evitando problemas como "LIMA METROPOLITANA" vs "LIMA".
 *
 *   departamento → código de 2 dígitos  (ubigeo[0:2])
 *   provincia    → código de 4 dígitos  (ubigeo[0:4])
 *   distrito     → código de 6 dígitos  (ubigeo[0:6])
 */
import type { Feature } from "geojson";

export type Nivel = "departamento" | "provincia" | "distrito";

export interface NivelConfig {
  /** URL del GeoJSON de este nivel (en /public/geo) */
  geojson: string;
  /** Propiedad del feature que contiene su código completo */
  codeProp: string;
  /** Propiedad del feature para mostrar el nombre */
  nameProp: string;
  /** Siguiente nivel al hacer drill-down (null = nivel más profundo) */
  siguiente: Nivel | null;
  /**
   * Dado un feature y el código del padre, indica si pertenece a ese padre.
   * (null para departamento, que no tiene padre)
   */
  perteneceAlPadre: ((props: Record<string, unknown>, padre: string) => boolean) | null;
}

export const NIVELES: Record<Nivel, NivelConfig> = {
  departamento: {
    geojson: "/geo/peru-departamentos.geo.json",
    codeProp: "FIRST_IDDP",
    nameProp: "NOMBDEP",
    siguiente: "provincia",
    perteneceAlPadre: null,
  },
  provincia: {
    geojson: "/geo/peru-provincias.geo.json",
    codeProp: "FIRST_IDPR",
    nameProp: "NOMBPROV",
    siguiente: "distrito",
    // FIRST_IDPR = 4 díg; el departamento padre son los 2 primeros
    perteneceAlPadre: (props, padre) =>
      String(props.FIRST_IDPR ?? "").slice(0, 2) === padre,
  },
  distrito: {
    geojson: "/geo/peru-distritos.geo.json",
    codeProp: "IDDIST",
    nameProp: "NOMBDIST",
    siguiente: null,
    // el distrito ya trae el código de su provincia
    perteneceAlPadre: (props, padre) => String(props.IDPROV ?? "") === padre,
  },
};

/** Código completo de un feature según su nivel */
export function codigoDeFeature(feature: Feature, nivel: Nivel): string {
  const cfg = NIVELES[nivel];
  return String(feature.properties?.[cfg.codeProp] ?? "");
}

/** Nombre legible de un feature según su nivel */
export function nombreDeFeature(feature: Feature, nivel: Nivel): string {
  const cfg = NIVELES[nivel];
  return String(feature.properties?.[cfg.nameProp] ?? "?");
}

export interface DatoMapa {
  codigo: string;
  nombre: string;
  total: number;
}
