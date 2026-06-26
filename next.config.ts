import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  // Fijar la raíz del workspace a este proyecto.
  // Evita que Next/Turbopack tome por error el package-lock.json y el
  // proyecto ajeno que existen en C:\Users\Jerson (carpeta de usuario).
  turbopack: {
    root: path.resolve(__dirname),
  },
};

export default nextConfig;
