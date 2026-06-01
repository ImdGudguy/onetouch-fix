/** @type {import('next').NextConfig} */
const nextConfig = {
  // Standalone output is for Docker / VM deploys. On Netlify the
  // @netlify/plugin-nextjs runtime manages output itself and breaks if
  // 'standalone' is set, so disable it when building on Netlify.
  output: process.env.NETLIFY ? undefined : 'standalone',
}
module.exports = nextConfig
