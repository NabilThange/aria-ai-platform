import type { NextConfig } from "next";
import dotenv from "dotenv";

dotenv.config();

const nextConfig: NextConfig = {
  transpilePackages: ["@bytebot/shared"],
  
  // Speed up compilation
  experimental: {
    optimizePackageImports: ['@hugeicons/react', '@hugeicons/core-free-icons'],
  },
  
  // Faster builds in development
  webpack: (config, { dev, isServer }) => {
    if (dev && !isServer) {
      // Reduce bundle size and compilation time
      config.optimization = {
        ...config.optimization,
        removeAvailableModules: false,
        removeEmptyChunks: false,
        splitChunks: false,
      };
    }
    return config;
  },
};

export default nextConfig;
