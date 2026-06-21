/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // TypeScript errors still fail the build (we want type safety),
  // but ESLint stylistic rules shouldn't block a deploy.
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
