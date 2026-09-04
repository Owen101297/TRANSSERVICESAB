import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  async redirects() {
    return [
      {
        source: "/asistir",
        destination: "/apps/asistencia/index.html",
        permanent: false,
      },
      {
        source: "/asistencia/registro",
        destination: "/apps/asistencia/index.html",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
