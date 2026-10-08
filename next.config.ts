import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
