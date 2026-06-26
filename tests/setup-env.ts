/**
 * Carga el archivo .env a process.env antes de correr los tests.
 * Así los tests de integración pueden usar DATABASE_URL.
 * Si no existe .env, no pasa nada (los tests de integración se saltan).
 */
import fs from "node:fs";
import path from "node:path";

const envPath = path.join(process.cwd(), ".env");

if (fs.existsSync(envPath)) {
  const contenido = fs.readFileSync(envPath, "utf8");
  for (const linea of contenido.split(/\r?\n/)) {
    const m = linea.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (!m) continue;
    const clave = m[1];
    const valor = m[2].trim().replace(/^["']|["']$/g, "");
    if (!(clave in process.env)) process.env[clave] = valor;
  }
}
