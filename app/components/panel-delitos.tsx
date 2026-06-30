"use client";

import type { DatoMapa } from "@/app/lib/geo-config";

export interface DetalleRegion {
  codigo: string;
  nivel: string;
  nombre: string;
  total: number;
  registros: number;
  porModalidad: { modalidad: string; total: number }[];
}

interface Props {
  detalle: DetalleRegion | null;
  cargando: boolean;
  tituloNivel: string;
  regiones: DatoMapa[];
  onSeleccionarRegion: (codigo: string, nombre: string) => void;
}

const fmt = (n: number) => n.toLocaleString("es-PE");

function Barra({ valor, max }: { valor: number; max: number }) {
  const ancho = max > 0 ? Math.max(2, (valor / max) * 100) : 0;
  return (
    <div className="h-2 w-full rounded-full bg-zinc-200 dark:bg-zinc-700">
      <div className="h-2 rounded-full bg-red-600" style={{ width: `${ancho}%` }} />
    </div>
  );
}

/**
 * Panel lateral con la data de delitos de la región en foco. Se actualiza
 * cada vez que se entra más adentro en el mapa (departamento → provincia →
 * distrito) o cuando cambian los filtros.
 */
export default function PanelDelitos({
  detalle,
  cargando,
  tituloNivel,
  regiones,
  onSeleccionarRegion,
}: Props) {
  const modalidades = detalle?.porModalidad ?? [];
  const maxModalidad = modalidades[0]?.total ?? 0;
  const maxRegion = regiones[0]?.total ?? 0;

  return (
    <aside className="flex w-full shrink-0 flex-col gap-5 rounded-lg border border-zinc-200 bg-white p-5 dark:border-zinc-700 dark:bg-zinc-900 lg:w-[340px]">
      {/* Resumen de la región en foco */}
      <section>
        <p className="text-xs font-medium uppercase tracking-wide text-red-600">
          {detalle?.nivel === "nacional" ? "Nacional" : detalle?.nivel ?? "—"}
        </p>
        <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
          {detalle?.nombre ?? "—"}
        </h2>

        <div className="mt-3 grid grid-cols-2 gap-3">
          <div className="rounded-lg bg-red-50 p-3 dark:bg-red-950/40">
            <p className="text-xs text-zinc-500 dark:text-zinc-400">Total denuncias</p>
            <p className="text-lg font-bold text-red-700 dark:text-red-400">
              {cargando ? "…" : fmt(detalle?.total ?? 0)}
            </p>
          </div>
          <div className="rounded-lg bg-zinc-50 p-3 dark:bg-zinc-800">
            <p className="text-xs text-zinc-500 dark:text-zinc-400">Registros</p>
            <p className="text-lg font-bold text-zinc-700 dark:text-zinc-200">
              {cargando ? "…" : fmt(detalle?.registros ?? 0)}
            </p>
          </div>
        </div>
      </section>

      {/* Desglose por modalidad */}
      {modalidades.length > 0 && (
        <section>
          <h3 className="mb-2 text-sm font-semibold text-zinc-700 dark:text-zinc-300">
            Modalidades más frecuentes
          </h3>
          <ul className="flex flex-col gap-2.5">
            {modalidades.map((m) => (
              <li key={m.modalidad}>
                <div className="mb-1 flex items-baseline justify-between gap-2 text-xs">
                  <span className="truncate text-zinc-600 dark:text-zinc-400" title={m.modalidad}>
                    {m.modalidad}
                  </span>
                  <span className="shrink-0 font-medium text-zinc-800 dark:text-zinc-200">
                    {fmt(m.total)}
                  </span>
                </div>
                <Barra valor={m.total} max={maxModalidad} />
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Ranking de regiones del nivel actual */}
      {regiones.length > 0 && (
        <section>
          <h3 className="mb-2 text-sm font-semibold text-zinc-700 dark:text-zinc-300">
            {tituloNivel}
            <span className="ml-1 font-normal text-zinc-400">(clic para entrar)</span>
          </h3>
          <ul className="flex max-h-72 flex-col overflow-y-auto">
            {regiones.map((r, i) => (
              <li key={r.codigo}>
                <button
                  type="button"
                  onClick={() => onSeleccionarRegion(r.codigo, r.nombre)}
                  className="flex w-full items-center gap-3 rounded-md px-2 py-1.5 text-left text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800"
                >
                  <span className="w-5 shrink-0 text-xs text-zinc-400">{i + 1}</span>
                  <span className="flex-1 truncate text-zinc-700 dark:text-zinc-300">
                    {r.nombre}
                  </span>
                  <span className="shrink-0 text-xs font-medium text-zinc-500 dark:text-zinc-400">
                    {fmt(r.total)}
                  </span>
                  <span className="hidden h-1.5 w-16 shrink-0 sm:block">
                    <Barra valor={r.total} max={maxRegion} />
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </aside>
  );
}
