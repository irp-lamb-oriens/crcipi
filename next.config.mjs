/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async rewrites() {
    return [
      { source: "/es/quienes-somos", destination: "/es/about" },
      { source: "/es/unete", destination: "/es/join" },
    ];
  },
};

export default nextConfig;
