const { PHASE_DEVELOPMENT_SERVER } = require('next/constants');

const configuredBasePath = process.env.NEXT_PUBLIC_BASE_PATH ?? '';
if (
  configuredBasePath &&
  configuredBasePath !== '/' &&
  !/^\/[A-Za-z0-9._~-]+(?:\/[A-Za-z0-9._~-]+)*\/?$/.test(configuredBasePath)
) {
  throw new Error('NEXT_PUBLIC_BASE_PATH must be empty or an absolute URL path without traversal segments.');
}
const basePath = configuredBasePath === '' || configuredBasePath === '/'
  ? ''
  : `/${configuredBasePath.replace(/^\/+|\/+$/g, '')}`;

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  basePath,
  trailingSlash: true,
  outputFileTracingRoot: __dirname,
  reactStrictMode: true,
  images: {
    unoptimized: true,
  },
};

module.exports = (phase) => ({
  ...nextConfig,
  // A production build cleans its distDir; keep the running dev server isolated.
  distDir: phase === PHASE_DEVELOPMENT_SERVER ? '.next-dev' : '.next',
});
