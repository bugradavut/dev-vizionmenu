import type { Config } from "tailwindcss";
import { createTailwindConfig } from "@vision-menu/config";

const config: Config = createTailwindConfig([
  "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
  "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
  "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
]);

export default config;
