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
    
    // Ensure CSS is properly processed
    config.module.rules.push({
      test: /\.css$/,
      use: ['style-loader', 'css-loader', 'postcss-loader'],
    });
    
    return config;
  },
  // Configure rewrites to proxy API requests to Netlify functions
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: '/.netlify/functions/:path*',
      },
    ];
  },
};

module.exports = nextConfig; 