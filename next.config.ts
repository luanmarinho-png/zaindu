import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  async rewrites() {
    // /forms é o questionário fixo da Dra. Celina; /formulario/<identificador> são os criados no admin.
    return [{ source: '/forms', destination: '/forms.html' }, { source: '/formulario/:slug', destination: '/formulario.html' }];
  },
};

export default nextConfig;
