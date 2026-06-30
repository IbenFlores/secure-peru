import { NextResponse } from "next/server";
import { PrismaClient, Prisma } from "@prisma/client";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// El nivel (y el nombre que mostramos) depende del largo del código de ubigeo.
function columnaNombre(codigo: string): Prisma.Sql | null {
  if (codigo.length >= 6) return Prisma.sql`distrito`;
  if (codigo.length >= 4) return Prisma.sql`provincia`;
  if (codigo.length >= 2) return Prisma.sql`departamento`;
  return null; // nivel nacional
}

function nombreNivel(codigo: string): string {
  if (codigo.length >= 6) return "distrito";
  if (codigo.length >= 4) return "provincia";
  if (codigo.length >= 2) return "departamento";
  return "nacional";
}

/**
 * GET /api/mapa/detalle
 *   codigo:    código de ubigeo de la región (2, 4 o 6 díg.). Vacío = nacional.
 *   anio:      filtro opcional por año
 *   modalidad: filtro opcional por modalidad
 *
 * Devuelve el resumen de una región para el panel lateral: total, número de
 * registros y el desglose por modalidad. Cruza por código de ubigeo igual que
 * /api/mapa (lpad a 6 dígitos, ya que en BD el ubigeo es int y pierde el cero).
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const codigo = searchParams.get("codigo") ?? "";
    const anioParam = searchParams.get("anio");
    const modalidadParam = searchParams.get("modalidad");

    if (codigo && !/^\d{2}(\d{2}(\d{2})?)?$/.test(codigo)) {
      return NextResponse.json({ error: "codigo inválido" }, { status: 400 });
    }

    const ubigeo = Prisma.sql`lpad(ubigeo::text, 6, '0')`;
    const condiciones: Prisma.Sql[] = [];
    if (codigo) {
      condiciones.push(Prisma.sql`substr(${ubigeo}, 1, ${codigo.length}) = ${codigo}`);
    }
    if (anioParam) condiciones.push(Prisma.sql`anio = ${parseInt(anioParam, 10)}`);
    if (modalidadParam) condiciones.push(Prisma.sql`modalidad = ${modalidadParam}`);

    const where = condiciones.length
      ? Prisma.sql`WHERE ${Prisma.join(condiciones, " AND ")}`
      : Prisma.empty;

    // Nombre de la región (null a nivel nacional)
    const colNombre = columnaNombre(codigo);
    let nombre = "Perú";
    if (colNombre) {
      const filas = await prisma.$queryRaw<{ nombre: string | null }[]>(Prisma.sql`
        SELECT max(${colNombre}) AS nombre FROM "Denuncia" ${where}
      `);
      nombre = filas[0]?.nombre ?? "Sin datos";
    }

    const [resumen, porModalidad] = await Promise.all([
      prisma.$queryRaw<{ total: number; registros: number }[]>(Prisma.sql`
        SELECT coalesce(sum(cantidad), 0)::int AS total,
               count(*)::int                    AS registros
        FROM "Denuncia" ${where}
      `),
      prisma.$queryRaw<{ modalidad: string; total: number }[]>(Prisma.sql`
        SELECT modalidad, sum(cantidad)::int AS total
        FROM "Denuncia" ${where}
        GROUP BY modalidad
        ORDER BY total DESC
        LIMIT 8
      `),
    ]);

    return NextResponse.json({
      codigo,
      nivel: nombreNivel(codigo),
      nombre,
      total: resumen[0]?.total ?? 0,
      registros: resumen[0]?.registros ?? 0,
      porModalidad,
    });
  } catch (error) {
    console.error("Error consultando el detalle del mapa:", error);
    return NextResponse.json(
      { error: "Error interno del servidor al procesar el detalle" },
      { status: 500 }
    );
  }
}
