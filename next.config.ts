import type { NextConfig } from "next";
const config: NextConfig = {
  devIndicators: false,
  output: "standalone",
  allowedDevOrigins: ["vicentemateus.iatende.sbs"],
};
export default config;
