/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'export',
  distDir: 'out',
  images: {
    unoptimized: true,
  },
  // Ensure all dependencies are properly handled
  transpilePackages: ['@react-pdf/renderer', 'recharts'],
  // Disable webpack optimization for static export
  webpack: (config) => {
    config.resolve.fallback = {
      ...config.resolve.fallback,
      canvas: false
    };
    return config;
  },
};

module.exports = nextConfig; 