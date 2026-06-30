import { NextResponse } from "next/server";
import fs from "node:fs";
import path from "node:path";
import { parse } from "csv-parse";
import { PrismaClient, Prisma } from "@prisma/client";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// Definimos la estructura exacta que viene del CSV
interface CsvRow {
  ANIO: string;
  MES: string;
  DPTO_HECHO_NEW: string;
  PROV_HECHO: string;
  DIST_HECHO: string;
  UBIGEO_HECHO: string;
  P_MODALIDADES: string;
  cantidad: string;
}

export async function POST() {
  try {
    // 1. Ubicación fija provisional del archivo en el proyecto
    // Coloquen el archivo CSV dentro de una carpeta llamada 'data' en la raíz del proyecto
    const csvFilePath = path.join(process.cwd(), "data", "DATASET_Denuncias_Policiales_Ene 2018 a Abr 2026.csv");

    if (!fs.existsSync(csvFilePath)) {
      return NextResponse.json(
        { error: "Archivo CSV no encontrado en la ruta fija 'data/'" },
        { status: 404 }
      );
    }

    // 2. Configurar el stream de lectura para procesar fila por fila de forma eficiente
    const fileStream = fs.createReadStream(csvFilePath);
    const parser = fileStream.pipe(
      parse({
        columns: true, // Usa la primera fila como llaves del objeto
        skip_empty_lines: true,
      })
    );

    let batch: Prisma.DenunciaCreateManyInput[] = [];
    const BATCH_SIZE = 5000; // Insertar de 5k en 5k registros para optimizar PostgreSQL
    let totalInserted = 0;

    console.log("Iniciando la migración de datos a PostgreSQL...");

    // Limpiar tabla antes de cargar (Opcional, útil para pruebas de desarrollo)
    // await prisma.denuncia.deleteMany({});

    for await (const row of parser) {
      const dataRow = row as CsvRow;

      // Mapeamos los campos de texto y convertimos los números correctamente
      batch.push({
        anio: Number.parseInt(dataRow.ANIO),
        mes: Number.parseInt(dataRow.MES),
        departamento: dataRow.DPTO_HECHO_NEW.trim(),
        provincia: dataRow.PROV_HECHO.trim(),
        distrito: dataRow.DIST_HECHO.trim(),
        ubigeo: Number.parseInt(dataRow.UBIGEO_HECHO),
        modalidad: dataRow.P_MODALIDADES.trim(),
        cantidad: Number.parseInt(dataRow.cantidad),
      });

      // Cuando el lote está lleno, se inserta en masa en la BD
      if (batch.length === BATCH_SIZE) {
        await prisma.denuncia.createMany({
          data: batch,
        });
        totalInserted += batch.length;
        console.log(`Progreso: ${totalInserted} registros insertados...`);
        batch = []; // Limpiamos el lote
      }
    }

    // Insertar los registros restantes que no completaron el último lote de 5000
    if (batch.length > 0) {
      await prisma.denuncia.createMany({
        data: batch,
      });
      totalInserted += batch.length;
    }

    console.log(`Migración completada exitosamente. Total registros: ${totalInserted}`);

    return NextResponse.json({
      message: "Data del CSV insertada en PostgreSQL con éxito",
      registrosProcesados: totalInserted,
    });

  } catch (error) {
    console.error("Error al procesar el CSV:", error);
    return NextResponse.json(
      { error: "Error interno del servidor", detalles: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}