import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import type { FeatureCollection } from "geojson";
import { NIVELES, type Nivel } from "../app/lib/geo-config";

function cargarGeo(nivel: Nivel): FeatureCollection {
  const ruta = path.join(process.cwd(), "public", NIVELES[nivel].geojson);
  return JSON.parse(fs.readFileSync(ruta, "utf8"));
}

const NIVELES_TEST: { nivel: Nivel; minFeatures: number; longitudCodigo: number }[] = [
  { nivel: "departamento", minFeatures: 24, longitudCodigo: 2 },
  { nivel: "provincia", minFeatures: 190, longitudCodigo: 4 },
  { nivel: "distrito", minFeatures: 1800, longitudCodigo: 6 },
];

describe("Integridad de los GeoJSON en public/geo", () => {
  for (const { nivel, minFeatures, longitudCodigo } of NIVELES_TEST) {
    describe(nivel, () => {
      const geo = cargarGeo(nivel);
      const cfg = NIVELES[nivel];

      it("es una FeatureCollection con suficientes features", () => {
        expect(geo.type).toBe("FeatureCollection");
        expect(geo.features.length).toBeGreaterThanOrEqual(minFeatures);
      });

      it("todos los features tienen código y nombre", () => {
        for (const f of geo.features) {
          const codigo = f.properties?.[cfg.codeProp];
          const nombre = f.properties?.[cfg.nameProp];
          expect(codigo, `${cfg.codeProp} faltante`).toBeTruthy();
          expect(nombre, `${cfg.nameProp} faltante`).toBeTruthy();
        }
      });

      it(`todos los códigos tienen ${longitudCodigo} dígitos`, () => {
        for (const f of geo.features) {
          const codigo = String(f.properties?.[cfg.codeProp]);
          expect(codigo).toMatch(new RegExp(`^\\d{${longitudCodigo}}$`));
        }
      });
    });
  }
});

describe("Filtro por padre sobre los datos reales", () => {
  it("las provincias del departamento de Arequipa (04) son 8", () => {
    const geo = cargarGeo("provincia");
    const fn = NIVELES.provincia.perteneceAlPadre!;
    const provs = geo.features.filter((f) => fn(f.properties ?? {}, "04"));
    const codigos = new Set(provs.map((f) => String(f.properties?.FIRST_IDPR)));
    expect(codigos.size).toBe(8);
    // todas deben empezar por "04"
    for (const c of codigos) expect(c.startsWith("04")).toBe(true);
  });

  it("los distritos de la provincia de Arequipa (0401) pertenecen a esa provincia", () => {
    const geo = cargarGeo("distrito");
    const fn = NIVELES.distrito.perteneceAlPadre!;
    const dists = geo.features.filter((f) => fn(f.properties ?? {}, "0401"));
    expect(dists.length).toBeGreaterThan(0);
    for (const f of dists) {
      expect(String(f.properties?.IDPROV)).toBe("0401");
      expect(String(f.properties?.IDDIST).startsWith("0401")).toBe(true);
    }
  });
});
