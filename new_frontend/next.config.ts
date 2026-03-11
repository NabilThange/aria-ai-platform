import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Allow all local images (they're in /public)
    unoptimized: true,
  },
};

export default nextConfig;
