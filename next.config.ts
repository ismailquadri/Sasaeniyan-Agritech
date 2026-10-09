import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Classic dynamic rendering: SSE streaming + live DB reads per request.
  // (cacheComponents/dynamicIO conflicts with `export const dynamic` on SSE routes.)
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
