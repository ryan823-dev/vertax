import type { NextConfig } from "next";
import { assertStartupEnv } from "./src/lib/startup-env";
import { seoRedirects } from "./src/config/seo-redirects";

assertStartupEnv();

const nextConfig: NextConfig = {
  allowedDevOrigins: ["127.0.0.1", "localhost", "*.localhost"],
  serverExternalPackages: ["undici"],
  async redirects() {
    return seoRedirects;
  },
};

export default nextConfig;
