import path from "node:path"
import { fileURLToPath } from "node:url"
import createNextIntlPlugin from "next-intl/plugin"

const withNextIntl = createNextIntlPlugin()
const __dirname = path.dirname(fileURLToPath(import.meta.url))

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  turbopack: {
    root: path.join(__dirname, "..", ".."),
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.r2.dev",
        pathname: "/**",
      },
    ],
  },
}

export default withNextIntl(nextConfig)
