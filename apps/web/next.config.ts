import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  agentRules: false,
  experimental: {
    useTypeScriptCli: false,
  },
  output: "standalone",
  poweredByHeader: false,
};

export default nextConfig;
