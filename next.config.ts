import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  async rewrites() {
    return [
      {
        source: "/asistir",
        destination: "/apps/asistencia/index.html",
      },
      {
        source: "/asistencia/registro",
        destination: "/apps/asistencia/index.html",
      },
    ];
  },
};

export default nextConfig;
