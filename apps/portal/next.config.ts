import path from "path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  outputFileTracingRoot: path.join(__dirname, "../../"),
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
