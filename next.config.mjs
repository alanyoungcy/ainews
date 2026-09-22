/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Keep the long-running dev compiler isolated from production builds.
  // Running `next build` while `next dev` is active otherwise lets both
  // processes mutate the same webpack runtime and produces missing-chunk
  // errors such as `Cannot find module './331.js'`.
  distDir: process.env.NODE_ENV === "development" ? ".next-dev" : ".next",
};

export default nextConfig;
