import type { NextConfig } from "next";

const authHost = process.env.NEXT_PUBLIC_AUTH_HOST_URL || "https://worldwideview.dev";
const docsUrl = process.env.NEXT_PUBLIC_DOCS_URL || "https://worldwideview.dev/docs";

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
        destination: docsUrl,
        permanent: false,
      },
      {
        source: "/docs/:path*",
        destination: `${docsUrl}/:path*`,
        permanent: false,
      },
      {
        source: "/login",
        destination: `${authHost}/login`,
        permanent: false,
      },
      {
        source: "/login/:path*",
        destination: `${authHost}/login/:path*`,
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
