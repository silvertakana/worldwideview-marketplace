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
      {
        source: "/login",
        destination: "https://worldwideview.dev/login",
        permanent: false,
      },
      {
        source: "/login/:path*",
        destination: "https://worldwideview.dev/login/:path*",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
