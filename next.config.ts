import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  reactStrictMode: false,
  // output: 'standalone', // 暂不开启，如果体积实在太大再开
  turbopack: {
    root: path.resolve(__dirname),
  }
};

export default nextConfig;
