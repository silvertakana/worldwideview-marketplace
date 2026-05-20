import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  async redirects() {
    return [
      {
        source: "/docs",
        destination: "https://docs.worldwideview.dev",
        permanent: false,
      },
      {
        source: "/docs/:path*",
        destination: "https://docs.worldwideview.dev/:path*",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
