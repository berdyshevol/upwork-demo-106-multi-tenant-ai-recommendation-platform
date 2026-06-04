import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // LangChain pulls in optional native deps it never uses in our path; keep them external.
  serverExternalPackages: ["@langchain/core", "@langchain/openai", "langchain"],
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: false },
};

export default nextConfig;
