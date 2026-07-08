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
      { source: "/play", destination: "/challenge", permanent: false },
      { source: "/play/profile", destination: "/dashboard", permanent: false },
      {
        source: "/play/:category/setup",
        destination: "/challenge/:category/setup",
        permanent: false,
      },
      {
        source: "/play/:category/run",
        destination: "/challenge/:category/run",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
