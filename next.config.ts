import type { NextConfig } from "next";
import path from "path";
import { fileURLToPath } from "url";

const appDir = path.dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  // Parent folder has an extra package-lock.json; keep module resolution inside math-exam-prep.
  turbopack: {
    root: appDir,
  },
};

export default nextConfig;
