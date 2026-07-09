import type { NextConfig } from "next";
import path from "path";
import { fileURLToPath } from "url";

const appDir = path.dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  // Parent folder has an extra package-lock.json; keep module resolution inside math-exam-prep.
  turbopack: {
    root: appDir,
  },
  async redirects() {
    return [
      // Challenge mode was replaced by Sprint.
      { source: "/challenge", destination: "/sprint", permanent: false },
      { source: "/challenge/:path*", destination: "/sprint", permanent: false },
      { source: "/play", destination: "/sprint", permanent: false },
      { source: "/play/profile", destination: "/dashboard", permanent: false },
      { source: "/play/:path*", destination: "/sprint", permanent: false },
    ];
  },
};

export default nextConfig;
