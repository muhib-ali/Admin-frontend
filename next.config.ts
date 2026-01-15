import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
      {
        protocol: "http",
        hostname: "localhost",
        port: "3003",
        pathname: "/public/**",
      },
      {
        protocol: "http",
        hostname: "127.0.0.1",
        port: "3003",
        pathname: "/public/**",
      },
    ],
  },
  webpack: (config, { dev }) => {
    if (!dev) {
      config.cache = false;
    }
    return config;
  },
};

export default nextConfig;
