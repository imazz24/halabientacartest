import type { NextConfig } from "next";

// Demo mode (seed data, no backend) is the default so Vercel deploys run
// standalone. Set NEXT_PUBLIC_DEMO=0 to wire up the real backend instead.
const DEMO = process.env.NEXT_PUBLIC_DEMO !== "0";

const nextConfig: NextConfig = {
  // Self-contained server bundle for the Docker image.
  output: "standalone",
  async rewrites() {
    // No backend to proxy in demo mode: every /api request is answered from
    // in-memory seed data by the client lib.
    if (DEMO) return [];
    const backend = process.env.BACKEND_URL || "http://localhost:8000";
    return [
      { source: "/api/:path*", destination: `${backend}/api/:path*` },
      { source: "/static/:path*", destination: `${backend}/static/:path*` },
    ];
  },
};

export default nextConfig;