import { NextResponse } from "next/server";
import { PrismaClient, Prisma } from "@prisma/client";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

/**
 * GET /api/mapa/grafico
 *   codigo:    ubigeo prefix (2/4/6 díg) para filtrar por región. Vacío = nacional.
 *   anio:      filtro por año
 *   modalidad: filtro por tipo de delito
 *
 * Devuelve denuncias agrupadas por mes (1–12) para el gráfico de barras.
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

    const rows = await prisma.$queryRaw<{ mes: number; total: number }[]>(Prisma.sql`
      SELECT mes, sum(cantidad)::int AS total
      FROM "Denuncia"
      ${where}
      GROUP BY mes
      ORDER BY mes
    `);

    return NextResponse.json({ data: rows });
  } catch (error) {
    console.error("Error consultando gráfico:", error);
    return NextResponse.json(
      { error: "Error interno al generar datos del gráfico" },
      { status: 500 }
    );
  }
}
