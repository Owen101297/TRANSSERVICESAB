import type { NextConfig } from "next";

const BUILD_ID = process.env.RAILWAY_DEPLOYMENT_ID || `build-${Date.now()}`;

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  env: {
    NEXT_PUBLIC_APP_BUILD_ID: BUILD_ID,
  },
  generateBuildId: async () => {
    return BUILD_ID;
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
  async rewrites() {
    return [
      {
        source: "/:path*/sw.js",
        destination: "/sw.js",
      },
      {
        source: "/:path*/service-worker.js",
        destination: "/sw.js",
      },
      {
        source: "/service-worker.js",
        destination: "/sw.js",
      },
    ];
  },
  async headers() {
    return [
      {
        // Regla universal contra caché obsoleta para todas las páginas, apps y APIs del ERP
        source: "/((?!_next/static|_next/image).*)",
        headers: [
          {
            key: "Cache-Control",
            value: "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0",
          },
          {
            key: "Pragma",
            value: "no-cache",
          },
          {
            key: "Expires",
            value: "0",
          },
        ],
      },
      {
        source: "/sw.js",
        headers: [
          {
            key: "Cache-Control",
            value: "no-store, no-cache, must-revalidate, max-age=0",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
