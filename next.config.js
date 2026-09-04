/** @type {import('next').NextConfig} */
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

module.exports = nextConfig;
