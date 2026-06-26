import { describe, it, expect } from "vitest";
import {
  validarParametrosMapa,
  LEN_NIVEL,
  LEN_PADRE,
} from "../app/lib/mapa-validacion";

describe("validarParametrosMapa", () => {
  it("acepta departamento sin padre", () => {
    const r = validarParametrosMapa("departamento", "");
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.nivel).toBe("departamento");
      expect(r.lenNivel).toBe(2);
      expect(r.lenPadre).toBe(0);
    }
  });

  it("acepta provincia con padre de 2 dígitos", () => {
    const r = validarParametrosMapa("provincia", "04");
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.lenNivel).toBe(4);
  });

  it("acepta distrito con padre de 4 dígitos", () => {
    const r = validarParametrosMapa("distrito", "0401");
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.lenNivel).toBe(6);
  });

  it("rechaza un nivel desconocido", () => {
    const r = validarParametrosMapa("region", "04");
    expect(r).toEqual({ ok: false, error: "nivel inválido" });
  });

  it("rechaza un padre que no sea numérico", () => {
    const r = validarParametrosMapa("provincia", "ab");
    expect(r).toEqual({ ok: false, error: "padre inválido" });
  });

  it("rechaza provincia con padre de longitud incorrecta", () => {
    const r = validarParametrosMapa("provincia", "0401"); // debería ser 2 dígitos
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/2 dígitos/);
  });

  it("rechaza distrito sin padre", () => {
    const r = validarParametrosMapa("distrito", "");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/4 dígitos/);
  });

  it("las longitudes de cada nivel son consistentes", () => {
    expect(LEN_NIVEL).toEqual({ departamento: 2, provincia: 4, distrito: 6 });
    expect(LEN_PADRE).toEqual({ departamento: 0, provincia: 2, distrito: 4 });
  });
});
