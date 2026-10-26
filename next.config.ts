import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // "standalone" is for self-hosting / the sandbox preview server.
  // Vercel runs its own output tracing, so skip it there.
  output: process.env.VERCEL ? undefined : "standalone",
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
};

export default nextConfig;
