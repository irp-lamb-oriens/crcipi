/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async rewrites() {
    return [
      { source: "/es/quienes-somos", destination: "/es/about" },
      { source: "/es/unete", destination: "/es/join" },
      { source: "/es/directorio/:path*", destination: "/es/directory/:path*" },
      { source: "/es/empleos/:path*", destination: "/es/jobs/:path*" },
      { source: "/es/privacidad", destination: "/es/privacy" },
      { source: "/es/terminos", destination: "/es/terms" },
    ];
  },
};

export default nextConfig;
