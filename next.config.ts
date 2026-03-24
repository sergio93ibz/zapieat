import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Todas las rutas son dinámicas por defecto.
  // Evita que Next.js intente ejecutar rutas de API en build time
  // cuando no hay acceso a base de datos ni variables de entorno.
  experimental: {
    // No hacer static generation de rutas que usen headers/cookies/db
  },
  // Forzar rutas dinámicas globalmente para evitar errores de build
  // cuando DATABASE_URL no está disponible en tiempo de compilación
  output: "standalone",
};

export default nextConfig;
