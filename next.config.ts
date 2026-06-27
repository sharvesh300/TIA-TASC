import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Native / Node-only packages used by the extraction pipeline must not be
  // bundled by Turbopack — they use native bindings or Node APIs and are
  // required directly at runtime instead.
  serverExternalPackages: ["@napi-rs/canvas", "tesseract.js", "pdfjs-dist", "exceljs"],
  // Explicitly configure Turbopack's root directory to resolve workspace paths
  // and scan source files correctly.
  turbopack: {
    root: process.cwd(),
  },
};

export default nextConfig;
