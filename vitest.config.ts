import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: {
    // Permite usar el alias "@/..." (igual que en la app) dentro de los tests
    alias: { "@": path.resolve(__dirname) },
  },
  test: {
    // Carga las variables de .env (entre ellas DATABASE_URL) antes de los tests
    setupFiles: ["./tests/setup-env.ts"],
  },
});
