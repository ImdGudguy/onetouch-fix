/** @type {import('next').NextConfig} */
const nextConfig = {
  // Self-contained server build for Docker / VM deploys.
  output: 'standalone',
}
module.exports = nextConfig
