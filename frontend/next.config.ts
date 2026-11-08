import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  // Drafts uploaded to the citation checker can be several megabytes.
  experimental: { serverActions: { bodySizeLimit: '20mb' } },
  turbopack: {
    root: process.cwd(),
  },
};

export default nextConfig;
