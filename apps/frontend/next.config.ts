import path from "node:path";

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Monorepo: trace server chunks from repo root so nested apps/frontend deploys
  // resolve shared files and avoid tooling mis-detecting sibling lockfiles.
  outputFileTracingRoot: path.join(__dirname, "../.."),

  async redirects() {
    return [
      {
        source: "/admin/content-settings",
        destination: "/admin/site-settings",
        permanent: true,
      },
      {
        source: "/admin/content-settings/:path*",
        destination: "/admin/site-settings/:path*",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
