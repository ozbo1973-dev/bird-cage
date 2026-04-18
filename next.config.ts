import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Use standalone output only for Docker/self-hosted builds.
  // Vercel manages its own output format automatically.
  ...(process.env.DOCKER_BUILD === "true" ? { output: "standalone" } : {}),
  // Exclude local upload directory from NFT (Node File Tracing).
  // process.cwd() in uploads.ts would otherwise trace the entire project.
  outputFileTracingExcludes: {
    "*": ["./uploads/**"],
  },
};

export default nextConfig;
