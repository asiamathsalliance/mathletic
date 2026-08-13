import type { NextConfig } from "next";
import path from "path";
import { fileURLToPath } from "url";

const appDir = path.dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  // Parent folder has an extra package-lock.json; keep module resolution inside math-exam-prep.
  turbopack: {
    root: appDir,
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
        ],
      },
    ];
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
