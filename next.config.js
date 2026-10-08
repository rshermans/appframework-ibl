/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production' ? { exclude: ['error', 'warn'] } : false,
  },
  webpack(config, { isServer, webpack }) {
    if (!isServer) {
      // pptxgenjs (browser .pptx export) references Node built-ins it never uses in the browser.
      config.plugins.push(
        new webpack.NormalModuleReplacementPlugin(/^node:/, (resource) => {
          resource.request = resource.request.replace(/^node:/, '')
        })
      )
      config.resolve.fallback = { ...config.resolve.fallback, fs: false, https: false, http: false, path: false, os: false, stream: false, zlib: false }
    }
    return config
  },
}

module.exports = nextConfig
