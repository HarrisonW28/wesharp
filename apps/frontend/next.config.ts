import path from "node:path";

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Monorepo: trace server chunks from repo root so nested apps/frontend deploys
  // resolve shared files and avoid tooling mis-detecting sibling lockfiles.
  outputFileTracingRoot: path.join(__dirname, "../.."),
};

export default nextConfig;
