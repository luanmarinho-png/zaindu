import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  async rewrites() {
    return [{ source: '/forms', destination: '/forms.html' }];
  },
};

export default nextConfig;
