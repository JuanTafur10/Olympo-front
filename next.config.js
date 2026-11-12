/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    const backend = (
      process.env.NEXT_PUBLIC_API_HOST?.trim()
      || process.env.NEXT_PUBLIC_API_URL?.trim()
      || process.env.BACKEND_URL?.trim()
      || "http://localhost:4000"
    ).replace(/\/+$/, "");
    return [{ source: "/api/:path*", destination: `${backend}/api/:path*` }];
  },
};

module.exports = nextConfig;
