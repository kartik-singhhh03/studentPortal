import type { NextConfig } from "next";

/**
 * `output: "standalone"` is required for the Docker image.
 * Vercel builds use the default Next.js output (DOCKER_BUILD is unset).
 */
const nextConfig: NextConfig = {
  ...(process.env.DOCKER_BUILD === "1" ? { output: "standalone" as const } : {}),
  serverExternalPackages: [
    "@prisma/client",
    "prisma",
    "@prisma/adapter-neon",
    "@neondatabase/serverless",
  ],
};

export default nextConfig;
