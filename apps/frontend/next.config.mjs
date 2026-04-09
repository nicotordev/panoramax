import createNextIntlPlugin from "next-intl/plugin"
import path from "node:path"
import { fileURLToPath } from "node:url"

/** Relative to this package root (required for next-intl + Turbopack; no absolute paths). */
const withNextIntl = createNextIntlPlugin("./i18n/request.ts")
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
