import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const anioParam = searchParams.get("anio");
    const modalidadParam = searchParams.get("modalidad");

    const whereClause: any = {};
    if (anioParam) whereClause.anio = parseInt(anioParam);
    if (modalidadParam) whereClause.modalidad = modalidadParam;

    const agrupadoPorDpto = await prisma.denuncia.groupBy({
      by: ["departamento"],
      where: whereClause,
      _sum: {
        cantidad: true,
      },
      // Ordenar de mayor a menor cantidad de delitos
      orderBy: {
        _sum: {
          cantidad: "desc",
        },
      },
    });

    const resultado = agrupadoPorDpto.map((item) => ({
      departamento: item.departamento,
      total_denuncias: item._sum.cantidad || 0,
    }));

    return NextResponse.json({ data: resultado });

  } catch (error) {
    console.error("Error consultando datos del mapa:", error);
    return NextResponse.json(
      { error: "Error interno del servidor al procesar las métricas" },
      { status: 500 }
    );
  }
}