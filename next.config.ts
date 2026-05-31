import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
    ],
  },
  typescript: { ignoreBuildErrors: true },
  // Next 16 moved eslint config — disable lint during build via env instead
  experimental: {},
};

export default nextConfig;