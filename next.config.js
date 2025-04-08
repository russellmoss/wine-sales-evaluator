/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  webpack: (config, { isServer }) => {
    // Add specific configuration for @react-pdf/renderer
    if (!isServer) {
      config.resolve.alias = {
        ...config.resolve.alias,
        // Ensure canvas is properly handled in the browser
        canvas: false,
      };
    }
    return config;
  },
};

module.exports = nextConfig; 