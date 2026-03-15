import { withSentryConfig } from '@sentry/nextjs';

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'api.mapbox.com' },
      { protocol: 'https', hostname: 'maps.googleapis.com' },
    ],
  },
  // Suppress Sentry source map upload warnings when no auth token
  sentry: {
    hideSourceMaps: true,
  },
};

const sentryConfig = {
  silent: true, // Don't log Sentry build plugin output
  disableServerWebpackPlugin: !process.env.SENTRY_AUTH_TOKEN,
  disableClientWebpackPlugin: !process.env.SENTRY_AUTH_TOKEN,
};

export default withSentryConfig(nextConfig, sentryConfig);
