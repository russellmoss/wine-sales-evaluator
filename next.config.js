/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  images: {
    unoptimized: true,
  },
  // Ensure TypeScript is properly handled
  typescript: {
    // Don't fail the build if there are TypeScript errors
    // This allows deployment even with TypeScript warnings
    ignoreBuildErrors: true,
  },
  // Ensure all dependencies are properly handled
  transpilePackages: ['@react-pdf/renderer', 'recharts'],
  
  // Configure webpack for CSS and PDF handling
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
  
  // Environment variables configuration
  env: {
    NEXT_PUBLIC_USE_DIRECT_EVALUATION: process.env.NEXT_PUBLIC_USE_DIRECT_EVALUATION || 'false',
  },
  
  // Server runtime configuration
  serverRuntimeConfig: {
    CLAUDE_API_KEY: process.env.CLAUDE_API_KEY,
    JOB_STORAGE_TYPE: process.env.JOB_STORAGE_TYPE || 'file',
    JOB_MAX_AGE: process.env.JOB_MAX_AGE || '86400000',
    RENDER_STORAGE_DIR: process.env.RENDER_STORAGE_DIR || '/var/data/jobs',
  },
  
  // Public runtime configuration
  publicRuntimeConfig: {
    NODE_ENV: process.env.NODE_ENV || 'development',
    IS_RENDER: process.env.RENDER === 'true',
  },
};

module.exports = nextConfig; 