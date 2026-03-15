/** @type {import('next').NextConfig} */
const nextConfig = {
  // Allow Mapbox static tile images
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'api.mapbox.com' },
      { protocol: 'https', hostname: 'maps.googleapis.com' },
    ],
  },
};

export default nextConfig;
