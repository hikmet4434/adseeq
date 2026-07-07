/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  typescript: { ignoreBuildErrors: false },
  turbopack: {
    root: process.cwd()
  }
};

export default nextConfig;
