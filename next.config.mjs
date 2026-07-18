/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["three"],
  experimental: {
    serverActions: {
      bodySizeLimit: "8mb"
    }
  }
};

export default nextConfig;
