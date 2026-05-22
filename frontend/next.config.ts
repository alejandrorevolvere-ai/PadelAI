import type { NextConfig } from "next";

const securityHeaders = [
  {
    key: "X-Frame-Options",
    value: "DENY",
  },
  {
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  {
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
  {
    key: "Permissions-Policy",
    value:
      "camera=(), microphone=(), geolocation=(), accelerometer=(), gyroscope=(), payment=(self), usb=()",
  },
];

const nextConfig: NextConfig = {
  // Explicit compression (gzip/brotli)
  compress: true,

  // React strict mode for development warnings
  reactStrictMode: true,

  // Standalone output for Docker deployment
  output: "standalone",

  // Bundle Three.js correctly as external package
  serverExternalPackages: ["three"],

  async headers() {
    return [
      {
        // Apply these headers to all routes
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
  // Prevent information disclosure via x-powered-by
  poweredByHeader: false,
  // Only allow images from trusted sources
  images: {
    remotePatterns: [],
  },
};

export default nextConfig;
