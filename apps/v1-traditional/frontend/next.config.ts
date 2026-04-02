import type { NextConfig } from 'next';
const nextConfig: NextConfig = {
  devIndicators: false,
  transpilePackages: ['@filing/shared'],
  async rewrites() {
    return [
      {
        source: '/iam-proxy/:path*',
        destination: 'http://10.138.68.2:30302/api/haier/auth/:path*',
      },
      {
        source: '/api/:path*',
        destination: `${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3101'}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
