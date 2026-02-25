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
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' cdn.jsdelivr.net unpkg.com vercel.live",
              "style-src 'self' 'unsafe-inline' fonts.googleapis.com",
              "font-src 'self' fonts.gstatic.com",
              "img-src 'self' data: blob: https://*.googleusercontent.com https://*.google.com https://*.gstatic.com https://*.githubusercontent.com https://*.freepik.com",
              "connect-src 'self' *.supabase.co vitals.vercel-insights.com vercel.live wss://ws-us3.pusher.com fonts.googleapis.com fonts.gstatic.com cdn.jsdelivr.net unpkg.com",
              "frame-src 'self' vercel.live",
              "frame-ancestors 'self'",
              "base-uri 'self'",
              "form-action 'self'",
            ].join("; "),
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
