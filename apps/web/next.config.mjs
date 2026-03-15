import { withSentryConfig } from '@sentry/nextjs';

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'api.mapbox.com' },
      { protocol: 'https', hostname: 'maps.googleapis.com' },
    ],
  },
  experimental: {
    instrumentationHook: true,
  },
};

const sentryConfig = {
  silent: true,
  hideSourceMaps: true,
  disableServerWebpackPlugin: !process.env.SENTRY_AUTH_TOKEN,
  disableClientWebpackPlugin: !process.env.SENTRY_AUTH_TOKEN,
};

export default withSentryConfig(nextConfig, sentryConfig);
