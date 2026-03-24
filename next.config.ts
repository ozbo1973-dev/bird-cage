import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Use standalone output only for Docker/self-hosted builds.
  // Vercel manages its own output format automatically.
  ...(process.env.DOCKER_BUILD === "true" ? { output: "standalone" } : {}),
};

export default nextConfig;
