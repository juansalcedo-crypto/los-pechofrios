/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [{ protocol: 'https', hostname: 'crests.football-data.org' }],
  },
};
module.exports = nextConfig;
