import type { Config } from "tailwindcss";
import { createTailwindConfig } from "@vision-menu/config";
// eslint-disable-next-line @typescript-eslint/no-var-requires
const animatePlugin = require("tailwindcss-animate");

const config: Config = createTailwindConfig([
  "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
  "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
  "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  "../../packages/ui/src/**/*.{js,ts,jsx,tsx,mdx}",
]);

// Ensure the animate plugin is added
config.plugins = [...(config.plugins ?? []), animatePlugin];

export default config;
