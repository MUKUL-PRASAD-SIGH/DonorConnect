/** @type {import('next').NextConfig} */
const withPWA = require('next-pwa')({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development',
})

const nextConfig = {
  trailingSlash: true,
  images: {
    unoptimized: true
  },
  // NEXT_PUBLIC_API_URL is read at build time from the environment; there is no
  // silent fallback to a fake host — src/lib/api.ts defaults to localhost in dev.
}

module.exports = withPWA(nextConfig)