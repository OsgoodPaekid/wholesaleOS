/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Prisma needs to be treated as an external package in server components/functions.
  serverExternalPackages: ["@prisma/client", "bcryptjs"],
};

module.exports = nextConfig;
