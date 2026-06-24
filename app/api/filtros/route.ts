import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

export async function GET() {
  try {
    const [anios, modalidades] = await Promise.all([
      prisma.denuncia.findMany({
        select: { anio: true },
        distinct: ["anio"],
        orderBy: { anio: "asc" },
      }),
      prisma.denuncia.findMany({
        select: { modalidad: true },
        distinct: ["modalidad"],
        orderBy: { modalidad: "asc" },
      }),
    ]);

    return NextResponse.json({
      anios: anios.map((r) => r.anio),
      modalidades: modalidades.map((r) => r.modalidad),
    });
  } catch (error) {
    console.error("Error consultando filtros:", error);
    return NextResponse.json(
      { error: "Error al obtener filtros" },
      { status: 500 }
    );
  }
}
