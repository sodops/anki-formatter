/** @type {import('next').NextConfig} */
const nextConfig = {
  // Python API uchun proxy (development)
  async rewrites() {
    return process.env.NODE_ENV === 'development'
      ? [
          {
            source: '/api/python/:path*',
            destination: 'http://127.0.0.1:5000/:path*',
          },
        ]
      : [];
  },
};

module.exports = nextConfig;
