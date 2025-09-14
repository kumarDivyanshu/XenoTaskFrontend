import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  
  // Enable experimental features
  experimental: {
    optimizePackageImports: ['lucide-react', 'recharts'],
  },

  // Environment variables that should be available on client-side
  env: {
    NEXT_PUBLIC_APP_NAME: 'Xeno Analytics Dashboard',
    NEXT_PUBLIC_APP_VERSION: '1.0.0',
  },

  // Headers for security
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
