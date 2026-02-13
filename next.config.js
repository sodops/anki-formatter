/** @type {import('next').NextConfig} */
const nextConfig = {
  // Security Headers
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "X-DNS-Prefetch-Control",
            value: "on",
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          {
            key: "X-XSS-Protection",
            value: "1; mode=block",
          },
          {
            key: "X-Frame-Options",
            value: "SAMEORIGIN",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "Referrer-Policy",
            value: "origin-when-cross-origin",
          },
        ],
      },
    ];
  },
  // Python API uchun proxy (development)
  async rewrites() {
    return process.env.NODE_ENV === "development"
      ? [
          {
            source: "/api/python/:path*",
            destination: "http://127.0.0.1:5000/:path*",
          },
        ]
      : [];
  },
};

module.exports = nextConfig;
