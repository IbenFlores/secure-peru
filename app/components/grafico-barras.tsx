"use client";

import { useEffect, useState, useRef, useCallback } from "react";

interface DatoMes {
  mes: number;
  total: number;
}

interface Props {
  /** Código ubigeo de la región en foco (drill-down del mapa). Vacío = nacional */
  codigo: string;
  filtros: { anios: number[]; modalidades: string[] };
}

const MESES = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
const W = 700;
const H = 360;
const M = { top: 24, right: 20, bottom: 36, left: 56 };
const CW = W - M.left - M.right;
const CH = H - M.top - M.bottom;

const fmt = (n: number) => n.toLocaleString("es-PE");

export default function GraficoBarras({ codigo, filtros }: Props) {
  const [anio, setAnio] = useState("");
  const [modalidad, setModalidad] = useState("");
  const [datos, setDatos] = useState<DatoMes[]>([]);
  const [hover, setHover] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const svgRef = useRef<SVGSVGElement | null>(null);

  useEffect(() => {
    let cancelled = false;
    const params = new URLSearchParams();
    if (codigo) params.set("codigo", codigo);
    if (anio) params.set("anio", anio);
    if (modalidad) params.set("modalidad", modalidad);

    setLoading(true);
    fetch(`/api/mapa/grafico?${params.toString()}`)
      .then((r) => (r.ok ? r.json() : { data: [] }))
      .then((json) => {
        if (!cancelled) setDatos(json.data ?? []);
      })
      .catch(() => {
        if (!cancelled) setDatos([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [codigo, anio, modalidad]);

  const exportar = useCallback(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const clone = svg.cloneNode(true) as SVGSVGElement;
    clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    // Fondo blanco para la imagen exportada
    const bg = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    bg.setAttribute("width", String(W));
    bg.setAttribute("height", String(H));
    bg.setAttribute("fill", "white");
    clone.insertBefore(bg, clone.firstChild);

    const svgData = new XMLSerializer().serializeToString(clone);
    const blob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = W * 2;
      canvas.height = H * 2;
      const ctx = canvas.getContext("2d")!;
      ctx.scale(2, 2);
      ctx.drawImage(img, 0, 0);
      URL.revokeObjectURL(url);
      const a = document.createElement("a");
      a.href = canvas.toDataURL("image/png");
      a.download = "grafico-delitos.png";
      a.click();
    };
    img.src = url;
  }, []);

  // Construir array de 12 meses (rellenar faltantes con 0)
  const porMes = new Array(12).fill(0) as number[];
  for (const d of datos) {
    if (d.mes >= 1 && d.mes <= 12) porMes[d.mes - 1] = d.total;
  }
  const maxVal = Math.max(1, ...porMes);

  const barGroup = CW / 12;
  const gap = barGroup * 0.15;
  const barWidth = barGroup - gap * 2;

  // 5 líneas de referencia en el eje Y
  const yTicks = Array.from({ length: 5 }, (_, i) => Math.round((maxVal / 4) * i));

  return (
    <section className="mt-8 rounded-lg border border-zinc-200 bg-white p-5 dark:border-zinc-700 dark:bg-zinc-900">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
        <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
          Delitos por Mes
        </h3>
        <div className="flex flex-wrap items-center gap-3">
          <select
            value={anio}
            onChange={(e) => setAnio(e.target.value)}
            className="rounded border border-zinc-300 bg-white px-3 py-1.5 text-sm text-zinc-900 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
          >
            <option value="">Todos los años</option>
            {filtros.anios.map((a) => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>
          <select
            value={modalidad}
            onChange={(e) => setModalidad(e.target.value)}
            className="rounded border border-zinc-300 bg-white px-3 py-1.5 text-sm text-zinc-900 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
          >
            <option value="">Todos los tipos</option>
            {filtros.modalidades.map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
          <button
            type="button"
            onClick={exportar}
            className="rounded bg-blue-600 px-3 py-1.5 text-sm text-white hover:bg-blue-700"
          >
            Exportar imagen
          </button>
        </div>
      </div>

      <div className={`transition-opacity ${loading ? "opacity-50" : ""}`}>
        <svg ref={svgRef} viewBox={`0 0 ${W} ${H}`} className="w-full h-auto">
          <g transform={`translate(${M.left},${M.top})`}>
            {/* Grid + Y labels */}
            {yTicks.map((v, i) => {
              const y = CH - (v / maxVal) * CH;
              return (
                <g key={i}>
                  <line x1={0} x2={CW} y1={y} y2={y} stroke="#e5e5e5" strokeWidth={1} />
                  <text x={-8} y={y + 4} textAnchor="end" fill="#71717a" fontSize={11}>
                    {fmt(v)}
                  </text>
                </g>
              );
            })}

            {/* Barras */}
            {porMes.map((total, i) => {
              const barH = (total / maxVal) * CH;
              const x = i * barGroup + gap;
              const y = CH - barH;
              const active = hover === i;
              return (
                <g
                  key={i}
                  onMouseEnter={() => setHover(i)}
                  onMouseLeave={() => setHover(null)}
                  style={{ cursor: "pointer" }}
                >
                  <rect x={x} y={y} width={barWidth} height={barH} fill={active ? "#dc2626" : "#ef4444"} rx={2} />
                  <text x={x + barWidth / 2} y={CH + 18} textAnchor="middle" fill="#71717a" fontSize={11}>
                    {MESES[i]}
                  </text>
                  {active && (
                    <text x={x + barWidth / 2} y={y - 6} textAnchor="middle" fill="#18181b" fontSize={12} fontWeight="bold">
                      {fmt(total)}
                    </text>
                  )}
                </g>
              );
            })}

            {/* Eje X */}
            <line x1={0} x2={CW} y1={CH} y2={CH} stroke="#d4d4d8" strokeWidth={1} />
          </g>
        </svg>
      </div>
    </section>
  );
}
