import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "cdn.ispapp.com.br" },
    ],
  },
};

export default nextConfig;
