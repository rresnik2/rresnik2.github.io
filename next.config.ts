import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // GitHub Pages only serves files, so `next build` writes the whole site to
  // out/ as plain HTML, CSS and JS (every page was already static)
  output: "export",
  images: {
    // ...and nothing can resize images on request: lib/image-loader.ts points
    // at copies scripts/export-images.mts makes after the build
    loader: "custom",
    loaderFile: "./lib/image-loader.ts",
    // Fewer widths than Next's defaults, since each is a file per image. The
    // script reads these lists too, so it makes exactly the sizes asked for.
    deviceSizes: [640, 828, 1080, 1200, 1920, 2560],
    imageSizes: [256, 384],
  },
  // Lets a phone on the same Wi-Fi load the dev server's scripts (Next blocks
  // dev assets for any hostname other than localhost by default, so the page
  // arrived without JavaScript: no swipes, no Richie). Private network
  // addresses and .local hostnames only; dev only, no effect on builds.
  allowedDevOrigins: ["192.168.*.*", "10.*.*.*", "172.16.*.*", "*.local"],
  // This folder is the project root (a stray package-lock.json in the home
  // folder otherwise makes Next guess wrong and warn, in dev and in builds)
  turbopack: { root: path.join(__dirname) },
  outputFileTracingRoot: path.join(__dirname),
};

export default nextConfig;
