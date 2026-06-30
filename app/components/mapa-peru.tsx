"use client";

import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { geoMercator, geoPath } from "d3-geo";
import type { FeatureCollection, Feature } from "geojson";
import {
  NIVELES,
  codigoDeFeature,
  nombreDeFeature,
  type Nivel,
  type DatoMapa,
} from "@/app/lib/geo-config";
import PanelDelitos, { type DetalleRegion } from "./panel-delitos";

const WIDTH = 600;
const HEIGHT = 720;

/** Escala lineal de un valor entre min..max → 0..1 */
function lerp(value: number, min: number, max: number): number {
  if (max === min) return 0.5;
  return (value - min) / (max - min);
}

/** Interpola de blanco (#f7f7f7) a rojo oscuro (#7f0000) */
function colorScale(t: number): string {
  const r = Math.round(247 - t * 120);
  const g = Math.round(247 - t * 247);
  const b = Math.round(247 - t * 247);
  return `rgb(${r},${g},${b})`;
}

const ETIQUETA_NIVEL: Record<Nivel, string> = {
  departamento: "Departamentos",
  provincia: "Provincias",
  distrito: "Distritos",
};

interface TooltipState {
  x: number;
  y: number;
  nombre: string;
  total: number;
}

interface FiltrosData {
  anios: number[];
  modalidades: string[];
}

/** Una entrada en la navegación: nivel actual + código del padre + etiqueta */
interface Vista {
  nivel: Nivel;
  padre: string;
  label: string;
}

const VISTA_INICIAL: Vista = { nivel: "departamento", padre: "", label: "Perú" };

export default function MapaPeru() {
  // Navegación drill-down
  const [vista, setVista] = useState<Vista>(VISTA_INICIAL);
  const [breadcrumb, setBreadcrumb] = useState<Vista[]>([]);

  // GeoJSON cacheado por nivel (se carga bajo demanda)
  const geoCache = useRef<Partial<Record<Nivel, FeatureCollection>>>({});
  const [geoActual, setGeoActual] = useState<FeatureCollection | null>(null);

  // Datos de la API para la vista actual: Map<codigo, DatoMapa>
  const [datos, setDatos] = useState<Map<string, DatoMapa>>(new Map());

  const [tooltip, setTooltip] = useState<TooltipState | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetching, setFetching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Panel lateral: detalle de la región en foco.
  // En el nivel más profundo (distrito) no se puede entrar más, así que al
  // hacer clic solo se "enfoca" ese distrito en el panel.
  const [detalle, setDetalle] = useState<DetalleRegion | null>(null);
  const [cargandoDetalle, setCargandoDetalle] = useState(false);
  const [distritoSel, setDistritoSel] = useState<string | null>(null);

  // Filtros
  const [filtros, setFiltros] = useState<FiltrosData>({ anios: [], modalidades: [] });
  const [anio, setAnio] = useState("");
  const [modalidad, setModalidad] = useState("");

  // Carga la lista de filtros una sola vez
  useEffect(() => {
    let cancelled = false;
    fetch("/api/filtros")
      .then((r) => (r.ok ? r.json() : { anios: [], modalidades: [] }))
      .then((f) => {
        if (!cancelled) {
          setFiltros({ anios: f.anios ?? [], modalidades: f.modalidades ?? [] });
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  // Carga GeoJSON del nivel (con caché)
  const cargarGeo = useCallback(async (nivel: Nivel): Promise<FeatureCollection> => {
    const cache = geoCache.current[nivel];
    if (cache) return cache;
    const res = await fetch(NIVELES[nivel].geojson);
    if (!res.ok) throw new Error(`No se pudo cargar el mapa de ${nivel}`);
    const geo = (await res.json()) as FeatureCollection;
    geoCache.current[nivel] = geo;
    return geo;
  }, []);

  // Carga datos de la API para una vista + filtros
  const cargarDatos = useCallback(
    async (v: Vista, anioVal: string, modalidadVal: string): Promise<Map<string, DatoMapa>> => {
      const params = new URLSearchParams({ nivel: v.nivel });
      if (v.padre) params.set("padre", v.padre);
      if (anioVal) params.set("anio", anioVal);
      if (modalidadVal) params.set("modalidad", modalidadVal);

      const res = await fetch(`/api/mapa?${params.toString()}`);
      if (!res.ok) throw new Error("Error al consultar datos del mapa");
      const json = await res.json();
      const mapa = new Map<string, DatoMapa>();
      for (const d of (json.data ?? []) as DatoMapa[]) mapa.set(d.codigo, d);
      return mapa;
    },
    []
  );

  // Cada vez que cambia la vista o los filtros → recargar geo + datos
  useEffect(() => {
    let cancelled = false;
    const cargar = async () => {
      if (!loading) setFetching(true);
      try {
        const [geo, mapa] = await Promise.all([
          cargarGeo(vista.nivel),
          cargarDatos(vista, anio, modalidad),
        ]);
        if (cancelled) return;
        setGeoActual(geo);
        setDatos(mapa);
        setError(null);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Error desconocido");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
          setFetching(false);
        }
      }
    };
    cargar();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vista, anio, modalidad, cargarGeo, cargarDatos]);

  // Detalle de la región en foco para el panel lateral.
  // El foco es el distrito seleccionado o, por defecto, la región en la que se
  // entró (vista.padre); vacío = nivel nacional.
  useEffect(() => {
    let cancelled = false;
    const codigoFoco = distritoSel ?? vista.padre;
    const cargarDetalle = async () => {
      setCargandoDetalle(true);
      const params = new URLSearchParams();
      if (codigoFoco) params.set("codigo", codigoFoco);
      if (anio) params.set("anio", anio);
      if (modalidad) params.set("modalidad", modalidad);
      try {
        const res = await fetch(`/api/mapa/detalle?${params.toString()}`);
        const json = res.ok ? await res.json() : null;
        if (!cancelled) setDetalle(json && !json.error ? json : null);
      } catch {
        if (!cancelled) setDetalle(null);
      } finally {
        if (!cancelled) setCargandoDetalle(false);
      }
    };
    cargarDetalle();
    return () => {
      cancelled = true;
    };
  }, [distritoSel, vista.padre, anio, modalidad]);

  // Features visibles en la vista actual (filtrados por el padre)
  const features = useMemo<Feature[]>(() => {
    if (!geoActual) return [];
    const cfg = NIVELES[vista.nivel];
    if (!cfg.perteneceAlPadre) return geoActual.features;
    return geoActual.features.filter((f) =>
      cfg.perteneceAlPadre!(f.properties ?? {}, vista.padre)
    );
  }, [geoActual, vista]);

  // Rango min/max para la escala de color (sobre los datos de la vista)
  const { min, max } = useMemo(() => {
    const values = Array.from(datos.values()).map((d) => d.total);
    if (values.length === 0) return { min: 0, max: 1 };
    return { min: Math.min(...values), max: Math.max(...values) };
  }, [datos]);

  // Proyección que encuadra exactamente los features visibles (zoom automático)
  const pathGenerator = useMemo(() => {
    const projection = geoMercator();
    if (features.length > 0) {
      projection.fitExtent(
        [
          [16, 16],
          [WIDTH - 16, HEIGHT - 16],
        ],
        { type: "FeatureCollection", features } as FeatureCollection
      );
    } else {
      projection.center([-75.5, -9.5]).scale(1800).translate([WIDTH / 2, HEIGHT / 2]);
    }
    return geoPath().projection(projection);
  }, [features]);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent, feature: Feature) => {
      const codigo = codigoDeFeature(feature, vista.nivel);
      const dato = datos.get(codigo);
      setTooltip({
        x: e.clientX,
        y: e.clientY,
        nombre: nombreDeFeature(feature, vista.nivel),
        total: dato?.total ?? 0,
      });
    },
    [datos, vista.nivel]
  );

  const handleMouseLeave = useCallback(() => setTooltip(null), []);

  // Entrar a una región (desde el mapa o desde el ranking del panel).
  // Si hay un nivel más profundo, hace drill-down; si no (distrito), solo
  // enfoca esa zona en el panel lateral.
  const entrarRegion = useCallback(
    (codigo: string, nombre: string) => {
      const cfg = NIVELES[vista.nivel];
      if (cfg.siguiente) {
        setBreadcrumb((bc) => [...bc, vista]);
        setVista({ nivel: cfg.siguiente, padre: codigo, label: nombre });
        setDistritoSel(null);
      } else {
        setDistritoSel(codigo);
      }
      setTooltip(null);
    },
    [vista]
  );

  // Drill-down al hacer clic en un feature del mapa
  const handleClick = useCallback(
    (feature: Feature) => {
      const codigo = codigoDeFeature(feature, vista.nivel);
      const nombre = nombreDeFeature(feature, vista.nivel);
      entrarRegion(codigo, nombre);
    },
    [vista.nivel, entrarRegion]
  );

  // Navegar a una posición previa del breadcrumb (la ruta = breadcrumb + vista actual)
  const irABreadcrumb = useCallback(
    (index: number) => {
      setVista(breadcrumb[index]);
      setBreadcrumb((bc) => bc.slice(0, index));
      setDistritoSel(null);
      setTooltip(null);
    },
    [breadcrumb]
  );

  // Volver al inicio (mapa de departamentos)
  const reiniciar = useCallback(() => {
    setVista(VISTA_INICIAL);
    setBreadcrumb([]);
    setDistritoSel(null);
    setTooltip(null);
  }, []);

  function handleAnioChange(value: string) {
    setAnio(value);
  }
  function handleModalidadChange(value: string) {
    setModalidad(value);
  }
  function handleLimpiarFiltros() {
    setAnio("");
    setModalidad("");
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <p className="text-zinc-500 text-lg">Cargando mapa…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-96 gap-3">
        <p className="text-red-600 text-lg">{error}</p>
        <button
          type="button"
          onClick={reiniciar}
          className="rounded bg-zinc-200 px-3 py-1.5 text-sm text-zinc-700 hover:bg-zinc-300"
        >
          Volver al inicio
        </button>
      </div>
    );
  }

  const ruta = [...breadcrumb, vista];
  const cfgActual = NIVELES[vista.nivel];
  const etiquetaFiltro = [
    anio ? `Año ${anio}` : "Todos los años",
    modalidad || "Todas las modalidades",
  ].join(" · ");

  return (
    <div className="relative w-full">
      {/* Breadcrumb de navegación */}
      <nav className="mb-4 flex flex-wrap items-center justify-center gap-1 text-sm">
        {ruta.map((v, i) => {
          const esUltimo = i === ruta.length - 1;
          return (
            <span key={`${v.nivel}-${v.padre}-${i}`} className="flex items-center gap-1">
              {i > 0 && <span className="text-zinc-400">/</span>}
              {esUltimo ? (
                <span className="font-semibold text-zinc-900 dark:text-zinc-50">{v.label}</span>
              ) : (
                <button
                  type="button"
                  onClick={() => irABreadcrumb(i)}
                  className="text-blue-600 hover:underline dark:text-blue-400"
                >
                  {v.label}
                </button>
              )}
            </span>
          );
        })}
      </nav>

      {/* Filtros */}
      <div className="mb-4 flex flex-wrap items-center justify-center gap-4">
        <label className="flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300">
          Año
          <select
            value={anio}
            onChange={(e) => handleAnioChange(e.target.value)}
            className="rounded border border-zinc-300 bg-white px-3 py-1.5 text-sm text-zinc-900 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
          >
            <option value="">Todos</option>
            {filtros.anios.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        </label>

        <label className="flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300">
          Modalidad
          <select
            value={modalidad}
            onChange={(e) => handleModalidadChange(e.target.value)}
            className="rounded border border-zinc-300 bg-white px-3 py-1.5 text-sm text-zinc-900 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
          >
            <option value="">Todas</option>
            {filtros.modalidades.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </label>

        {(anio || modalidad) && (
          <button
            type="button"
            onClick={handleLimpiarFiltros}
            className="rounded bg-zinc-200 px-3 py-1.5 text-sm text-zinc-700 hover:bg-zinc-300 dark:bg-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-600"
          >
            Limpiar filtros
          </button>
        )}
      </div>

      {/* Indicador de nivel + filtro activo */}
      <p className="mb-2 text-center text-xs text-zinc-400">
        {ETIQUETA_NIVEL[vista.nivel]} · {etiquetaFiltro}
        {cfgActual.siguiente && " — haz clic en una zona para ver el detalle"}
        {fetching && " — actualizando…"}
      </p>

      {/* Mapa (izquierda) + panel de datos (derecha) */}
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
        <div className="min-w-0 flex-1">
          <svg
            viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
            className={`mx-auto h-auto w-full max-w-[600px] transition-opacity ${fetching ? "opacity-50" : ""}`}
          >
            {features.map((feature, i) => {
              const codigo = codigoDeFeature(feature, vista.nivel);
              const total = datos.get(codigo)?.total ?? 0;
              const t = lerp(total, min, max);
              const d = pathGenerator(feature) ?? "";
              const enfocado = !cfgActual.siguiente && distritoSel === codigo;

              return (
                <path
                  key={codigo || `f-${i}`}
                  d={d}
                  fill={total > 0 ? colorScale(t) : "#e5e5e5"}
                  stroke={enfocado ? "#1d4ed8" : "#fff"}
                  strokeWidth={enfocado ? 1.6 : 0.6}
                  onMouseMove={(e) => handleMouseMove(e, feature)}
                  onMouseLeave={handleMouseLeave}
                  onClick={() => handleClick(feature)}
                  className="cursor-pointer transition-opacity hover:opacity-75"
                />
              );
            })}
          </svg>

          {/* Leyenda */}
          <div className="mt-4 flex items-center justify-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
            <span>{min.toLocaleString("es-PE")}</span>
            <div
              className="h-3 w-48 rounded"
              style={{
                background: `linear-gradient(to right, ${colorScale(0)}, ${colorScale(0.5)}, ${colorScale(1)})`,
              }}
            />
            <span>{max.toLocaleString("es-PE")}</span>
            <span className="ml-1">denuncias</span>
          </div>
        </div>

        <PanelDelitos
          detalle={detalle}
          cargando={cargandoDetalle}
          tituloNivel={ETIQUETA_NIVEL[vista.nivel]}
          regiones={Array.from(datos.values())}
          onSeleccionarRegion={entrarRegion}
        />
      </div>

      {/* Tooltip */}
      {tooltip && (
        <div
          className="pointer-events-none fixed z-50 rounded bg-zinc-900 px-3 py-2 text-sm text-white shadow-lg"
          style={{ left: tooltip.x + 12, top: tooltip.y - 28 }}
        >
          <span className="font-semibold">{tooltip.nombre}</span>
          <br />
          {tooltip.total.toLocaleString("es-PE")} denuncias
        </div>
      )}
    </div>
  );
}
