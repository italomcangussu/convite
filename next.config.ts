import type { NextConfig } from "next";
const config: NextConfig = {
  devIndicators: false,
  output: "standalone",
  allowedDevOrigins: ["vicentemateus.iatende.sbs"],
  async headers() {
    return [
      {
        // Sprite names carry a hash of their content (scripts/slice_art.py),
        // so a changed picture is a new URL and these can be cached for good.
        source: "/illustrations/layers/:file*",
        headers: [
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
        ],
      },
    ];
  },
};
export default config;
