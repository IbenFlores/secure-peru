import { describe, it, expect } from "vitest";
import type { Feature } from "geojson";
import {
  NIVELES,
  codigoDeFeature,
  nombreDeFeature,
} from "../app/lib/geo-config";

// Features mínimos de ejemplo (solo necesitamos las propiedades)
function feat(properties: Record<string, unknown>): Feature {
  return { type: "Feature", properties, geometry: null } as unknown as Feature;
}

const depto = feat({ FIRST_IDDP: "04", NOMBDEP: "AREQUIPA" });
const prov = feat({ FIRST_IDPR: "0401", NOMBPROV: "AREQUIPA" });
const dist = feat({ IDDIST: "040101", IDPROV: "0401", NOMBDIST: "AREQUIPA" });

describe("codigoDeFeature", () => {
  it("lee el código de departamento (2 dígitos)", () => {
    expect(codigoDeFeature(depto, "departamento")).toBe("04");
  });
  it("lee el código de provincia (4 dígitos)", () => {
    expect(codigoDeFeature(prov, "provincia")).toBe("0401");
  });
  it("lee el código de distrito (6 dígitos)", () => {
    expect(codigoDeFeature(dist, "distrito")).toBe("040101");
  });
});

describe("nombreDeFeature", () => {
  it("lee el nombre según el nivel", () => {
    expect(nombreDeFeature(depto, "departamento")).toBe("AREQUIPA");
    expect(nombreDeFeature(prov, "provincia")).toBe("AREQUIPA");
    expect(nombreDeFeature(dist, "distrito")).toBe("AREQUIPA");
  });
  it("devuelve '?' si falta la propiedad", () => {
    expect(nombreDeFeature(feat({}), "departamento")).toBe("?");
  });
});

describe("perteneceAlPadre", () => {
  it("departamento no tiene filtro de padre", () => {
    expect(NIVELES.departamento.perteneceAlPadre).toBeNull();
  });

  it("una provincia pertenece a su departamento por los 2 primeros dígitos", () => {
    const fn = NIVELES.provincia.perteneceAlPadre!;
    expect(fn({ FIRST_IDPR: "0401" }, "04")).toBe(true);
    expect(fn({ FIRST_IDPR: "1501" }, "04")).toBe(false);
  });

  it("un distrito pertenece a su provincia por el código IDPROV", () => {
    const fn = NIVELES.distrito.perteneceAlPadre!;
    expect(fn({ IDPROV: "0401" }, "0401")).toBe(true);
    expect(fn({ IDPROV: "0402" }, "0401")).toBe(false);
  });
});

describe("NIVELES (configuración de drill-down)", () => {
  it("encadena los niveles departamento -> provincia -> distrito", () => {
    expect(NIVELES.departamento.siguiente).toBe("provincia");
    expect(NIVELES.provincia.siguiente).toBe("distrito");
    expect(NIVELES.distrito.siguiente).toBeNull();
  });
});
