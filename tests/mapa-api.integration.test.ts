/**
 * Tests de INTEGRACIÓN del endpoint /api/mapa contra la base de datos real.
 *
 * Requisitos para que corran:
 *   1. Tener la base de datos levantada (docker compose up -d).
 *   2. Tener los datos cargados (ver README, ingesta del CSV).
 *   3. Tener DATABASE_URL en el .env.
 *
 * Si no hay DATABASE_URL, estos tests se SALTAN automáticamente.
 */
import { describe, it, expect } from "vitest";
import { GET } from "../app/api/mapa/route";

const hayBaseDeDatos = !!process.env.DATABASE_URL;
const suite = hayBaseDeDatos ? describe : describe.skip;

function pedir(querystring: string): Request {
  return new Request(`http://localhost/api/mapa${querystring}`);
}

suite("/api/mapa (integración con base de datos)", () => {
  it("departamentos: devuelve zonas con código de 2 dígitos y total numérico", async () => {
    const res = await GET(pedir(""));
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(Array.isArray(json.data)).toBe(true);
    expect(json.data.length).toBeGreaterThan(0);

    for (const fila of json.data) {
      expect(String(fila.codigo)).toMatch(/^\d{2}$/);
      expect(typeof fila.total).toBe("number");
      expect(fila.total).toBeGreaterThanOrEqual(0);
    }
  });

  it("provincias de Arequipa (padre=04): todos los códigos empiezan en 04", async () => {
    const res = await GET(pedir("?nivel=provincia&padre=04"));
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.data.length).toBeGreaterThan(0);
    for (const fila of json.data) {
      expect(String(fila.codigo)).toMatch(/^04\d{2}$/);
    }
  });

  it("distritos de la provincia de Arequipa (padre=0401): códigos de 6 dígitos bajo 0401", async () => {
    const res = await GET(pedir("?nivel=distrito&padre=0401"));
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.data.length).toBeGreaterThan(0);
    for (const fila of json.data) {
      expect(String(fila.codigo)).toMatch(/^0401\d{2}$/);
    }
  });

  it("el filtro por año devuelve resultados válidos", async () => {
    const res = await GET(pedir("?anio=2024"));
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(Array.isArray(json.data)).toBe(true);
    expect(json.data.length).toBeGreaterThan(0);
  });

  it("rechaza un nivel inválido con error 400", async () => {
    const res = await GET(pedir("?nivel=galaxia"));
    expect(res.status).toBe(400);

    const json = await res.json();
    expect(json.error).toBe("nivel inválido");
  });

  it("rechaza una provincia sin padre con error 400", async () => {
    const res = await GET(pedir("?nivel=provincia"));
    expect(res.status).toBe(400);
  });
});
