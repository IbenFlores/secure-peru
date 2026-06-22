-- CreateTable
CREATE TABLE "Denuncia" (
    "id" SERIAL NOT NULL,
    "anio" INTEGER NOT NULL,
    "mes" INTEGER NOT NULL,
    "departamento" TEXT NOT NULL,
    "provincia" TEXT NOT NULL,
    "distrito" TEXT NOT NULL,
    "ubigeo" INTEGER NOT NULL,
    "modalidad" TEXT NOT NULL,
    "cantidad" INTEGER NOT NULL,

    CONSTRAINT "Denuncia_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Denuncia_anio_mes_idx" ON "Denuncia"("anio", "mes");

-- CreateIndex
CREATE INDEX "Denuncia_departamento_idx" ON "Denuncia"("departamento");

-- CreateIndex
CREATE INDEX "Denuncia_distrito_idx" ON "Denuncia"("distrito");

-- CreateIndex
CREATE INDEX "Denuncia_modalidad_idx" ON "Denuncia"("modalidad");
