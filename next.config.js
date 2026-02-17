/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'static-cdn.jtvnw.net',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'vod-secure.twitch.tv',
        pathname: '/**',
      },
    ],
  },
};

module.exports = nextConfig;
