import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  agentRules: false,
  experimental: {
    useTypeScriptCli: false,
  },
  output: "standalone",
  poweredByHeader: false,
  async rewrites() {
    return [
      {
        source: "/backend/:path*",
        destination: `${process.env.API_ORIGIN ?? "http://localhost:8000"}/:path*`,
      },
    ];
  },
};

export default nextConfig;
