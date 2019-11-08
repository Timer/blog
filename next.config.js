module.exports = {
  webpack(c, { isServer }) {
    if (!isServer) {
      c.node = { ...c.node, fs: 'empty' }
    }
    return c
  },
  experimental: { css: true, granularChunks: true },
}
