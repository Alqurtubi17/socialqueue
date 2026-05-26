/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: [
      "playwright",
      "playwright-extra",
      "puppeteer-extra-plugin-stealth",
      "@prisma/client",
      "prisma",
    ],
  },
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false, net: false, tls: false, child_process: false,
        "playwright": false,
        "playwright-extra": false,
        "puppeteer-extra-plugin-stealth": false,
      };
    }
    // Exclude Playwright dari bundle — hanya dipakai oleh worker mandiri
    config.externals = config.externals || [];
    if (isServer) {
      config.externals.push(
        "playwright",
        "playwright-extra",
        "puppeteer-extra-plugin-stealth",
      );
    }
    return config;
  },
};

module.exports = nextConfig;
