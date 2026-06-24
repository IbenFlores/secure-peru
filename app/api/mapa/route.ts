import { NextResponse } from "next/server";
import { PrismaClient, Prisma } from "@prisma/client";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

type Nivel = "departamento" | "provincia" | "distrito";

// Longitud del código (prefijo del ubigeo) que identifica cada nivel
const LEN_NIVEL: Record<Nivel, number> = {
  departamento: 2,
  provincia: 4,
  distrito: 6,
};

// Longitud del código del "padre" que se necesita para filtrar cada nivel
const LEN_PADRE: Record<Nivel, number> = {
  departamento: 0,
  provincia: 2,
  distrito: 4,
};

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
    const nivel = (searchParams.get("nivel") ?? "departamento") as Nivel;
    const padre = searchParams.get("padre") ?? "";
    const anioParam = searchParams.get("anio");
    const modalidadParam = searchParams.get("modalidad");

    if (!(nivel in LEN_NIVEL)) {
      return NextResponse.json({ error: "nivel inválido" }, { status: 400 });
    }
    if (padre && !/^\d+$/.test(padre)) {
      return NextResponse.json({ error: "padre inválido" }, { status: 400 });
    }

    const lenNivel = LEN_NIVEL[nivel];
    const lenPadre = LEN_PADRE[nivel];

    if (lenPadre > 0 && padre.length !== lenPadre) {
      return NextResponse.json(
        { error: `el nivel '${nivel}' requiere un 'padre' de ${lenPadre} dígitos` },
        { status: 400 }
      );
    }

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
