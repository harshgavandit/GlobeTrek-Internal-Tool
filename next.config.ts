import type { NextConfig } from 'next';

const distDir =
  process.env.NEXT_DIST_DIR ??
  (process.env.NODE_ENV === 'development' ? '.next-dev' : '.next');

const nextConfig: NextConfig = {
  distDir,
  reactStrictMode: true,
  poweredByHeader: false,
  outputFileTracingIncludes: {
    '/api/quotations/export': ['./assets/fonts/**/*'],
  },
  serverExternalPackages: ['pg', 'exceljs', 'jspdf', 'jspdf-autotable'],
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Referrer-Policy', value: 'same-origin' },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
