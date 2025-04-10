/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  images: {
    unoptimized: true,
  },
  // Ensure all dependencies are properly handled
  transpilePackages: ['@react-pdf/renderer', 'recharts'],
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
  // Configure environment variables
  env: {
    // Add any public environment variables that should be available to the client
    NEXT_PUBLIC_USE_DIRECT_EVALUATION: process.env.NEXT_PUBLIC_USE_DIRECT_EVALUATION || 'false',
  },
  // Configure server-side environment variables
  serverRuntimeConfig: {
    // Will only be available on the server side
    CLAUDE_API_KEY: process.env.CLAUDE_API_KEY,
    JOB_STORAGE_TYPE: process.env.JOB_STORAGE_TYPE || 'file',
    JOB_MAX_AGE: process.env.JOB_MAX_AGE || '86400000',
    RENDER_STORAGE_DIR: process.env.RENDER_STORAGE_DIR || '/tmp/jobs',
  },
  // Configure client-side environment variables
  publicRuntimeConfig: {
    // Will be available on both server and client
    NODE_ENV: process.env.NODE_ENV || 'development',
  },
};

module.exports = nextConfig; 