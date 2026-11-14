/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  experimental: {
    // Required for SSE streaming on Vercel (kept minimal)
    // appRouter: true, // using pages router for now
  },
  // Allow running from any directory — important for Vercel deployment
  output: 'standalone',
};

export default nextConfig;