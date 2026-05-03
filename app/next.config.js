/** @type {import('next').NextConfig} */
const withBundleAnalyzer = process.env.ANALYZE === 'true'
  ? require('@next/bundle-analyzer')({ enabled: true })
  : (config) => config;

const nextConfig = {
  transpilePackages: [
    '@solana/wallet-adapter-base',
    '@solana/wallet-adapter-react',
    '@solana/wallet-adapter-react-ui',
    '@solana/wallet-adapter-wallets',
  ],
  experimental: {
    optimizePackageImports: ['lucide-react', '@solana/web3.js'],
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.mypinata.cloud',
      },
      {
        protocol: 'https',
        hostname: 'gateway.pinata.cloud',
      },
      {
        protocol: 'https',
        hostname: 'ipfs.io',
      },
      {
        protocol: 'https',
        hostname: 'via.placeholder.com',
      }
    ],
  },
  turbopack: {
    resolveAlias: {
      'bn.js': 'bn.js',
    },
  },
  webpack(config, { isServer }) {
    // Only run webpack config in Webpack builds, not Turbopack
    if (process.env.__NEXT_WEBPACK_BUILD === 'true') {
      config.ignoreWarnings = [
        ...(config.ignoreWarnings ?? []),
        {
          module: /ox[\\/]_esm[\\/]tempo[\\/]internal[\\/]virtualMasterPool/,
          message: /Critical dependency/,
        },
      ];

      // Split heavy Solana / Anchor bundles into separate chunks so they are
      // only downloaded when the wallet-connected routes are visited.
      if (!isServer) {
        config.optimization.splitChunks = {
          ...config.optimization.splitChunks,
          cacheGroups: {
            ...(config.optimization.splitChunks?.cacheGroups ?? {}),
            solana: {
              name: 'solana-vendor',
              test: /[\\/]node_modules[\\/](@solana|@coral-xyz|bn\.js|pino|@protobufjs|@walletconnect|@reown)[\\/]/,
              chunks: 'all',
              priority: 40,
              reuseExistingChunk: true,
              enforce: true,
            },
          },
        };
      }
    }
    return config;
  },
};

module.exports = withBundleAnalyzer(nextConfig);

