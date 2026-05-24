import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  async rewrites() {
    return [
      {
        source: "/.well-known/jwks.json",
        destination: "/api/auth/jwks",
      },
    ];
  },
  async redirects() {
    return [
      {
        source: "/docs",
        destination: "https://worldwideview.dev/docs",
        permanent: false,
      },
      {
        source: "/docs/:path*",
        destination: "https://worldwideview.dev/docs/:path*",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
