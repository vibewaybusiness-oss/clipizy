import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  // Ensure Next.js binds to all interfaces for WSL compatibility
  experimental: {
    serverActions: {
      bodySizeLimit: '100mb',
    },
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'picsum.photos',
        port: '',
        pathname: '/**',
      },
    ],
  },
  async rewrites() {
    // Use backend URL from environment variable (centralized in settings.py)
    // For WSL, use the Windows host IP that's accessible from WSL
    let backendUrl = process.env.BACKEND_URL || 'http://localhost:8000';
    
    // If running in WSL and no BACKEND_URL is set, use the Windows host IP
    if (process.env.WSL_DISTRO_NAME && !process.env.BACKEND_URL) {
      backendUrl = 'http://172.31.240.1:8000';
    }
    
    console.log('Next.js rewrites using backend URL:', backendUrl);
    
    return [
      {
        source: '/api/:path*',
        destination: `${backendUrl}/:path*`,
      },
      {
        source: '/user-management/:path*',
        destination: `${backendUrl}/user-management/:path*`,
      },
      {
        source: '/backend/:path*',
        destination: '/api/backend/:path*',
      },
    ];
  },
};

export default nextConfig;
