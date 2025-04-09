/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  images: {
    unoptimized: true,
  },
  // Ensure all dependencies are properly handled
  transpilePackages: ['@react-pdf/renderer', 'recharts', '@netlify/functions'],
  // Disable webpack optimization for static export
  webpack: (config, { isServer }) => {
    // Add specific configuration for @react-pdf/renderer
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        canvas: false,
      };
    }
    return config;
  },
};

module.exports = nextConfig; 