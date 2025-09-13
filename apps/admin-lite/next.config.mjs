/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@ap/shared'],
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001',
  },
};

export default nextConfig;
