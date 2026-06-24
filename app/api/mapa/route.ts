import { NextResponse } from "next/server";
import { PrismaClient, Prisma } from "@prisma/client";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { validarParametrosMapa } from "@/app/lib/mapa-validacion";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

interface FilaMapa {
  codigo: string;
  nombre: string;
  total: number;
}

/**
 * GET /api/mapa
 *   nivel:      departamento | provincia | distrito   (default: departamento)
 *   padre:      código del nivel superior (2 díg para provincia, 4 díg para distrito)
 *   anio:       filtro opcional por año
 *   modalidad:  filtro opcional por modalidad
 *
 * Agrupa las denuncias por el prefijo del ubigeo correspondiente al nivel,
 * de modo que el join con el GeoJSON se hace por código (no por nombre).
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const nivelParam = searchParams.get("nivel") ?? "departamento";
    const padre = searchParams.get("padre") ?? "";
    const anioParam = searchParams.get("anio");
    const modalidadParam = searchParams.get("modalidad");

    const validacion = validarParametrosMapa(nivelParam, padre);
    if (!validacion.ok) {
      return NextResponse.json({ error: validacion.error }, { status: 400 });
    }
    const { nivel, lenNivel, lenPadre } = validacion;

    // ubigeo normalizado a 6 dígitos (en BD se guarda como int y pierde el cero inicial)
    const ubigeo = Prisma.sql`lpad(ubigeo::text, 6, '0')`;
    const nombreCol =
      nivel === "departamento"
        ? Prisma.sql`departamento`
        : nivel === "provincia"
          ? Prisma.sql`provincia`
          : Prisma.sql`distrito`;

    const condiciones: Prisma.Sql[] = [];
    if (lenPadre > 0) {
      condiciones.push(Prisma.sql`substr(${ubigeo}, 1, ${lenPadre}) = ${padre}`);
    }
    if (anioParam) condiciones.push(Prisma.sql`anio = ${parseInt(anioParam, 10)}`);
    if (modalidadParam) condiciones.push(Prisma.sql`modalidad = ${modalidadParam}`);

    const where = condiciones.length
      ? Prisma.sql`WHERE ${Prisma.join(condiciones, " AND ")}`
      : Prisma.empty;

    const rows = await prisma.$queryRaw<FilaMapa[]>(Prisma.sql`
      SELECT substr(${ubigeo}, 1, ${lenNivel}) AS codigo,
             max(${nombreCol})                 AS nombre,
             sum(cantidad)::int                AS total
      FROM "Denuncia"
      ${where}
      GROUP BY 1
      ORDER BY total DESC
    `);

    return NextResponse.json({ nivel, padre, data: rows });
  } catch (error) {
    console.error("Error consultando datos del mapa:", error);
    return NextResponse.json(
      { error: "Error interno del servidor al procesar las métricas" },
      { status: 500 }
    );
  }
}
