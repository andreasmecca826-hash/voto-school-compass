import { defineConfig } from "vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import { nitro } from "nitro/vite";
import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import tsConfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  server: {
    allowedHosts: true,
  },
  plugins: [
    tsConfigPaths(),
    tailwindcss(),
    tanstackStart({
      server: {
        entry: "server",
      },
      spa: {
        enabled: true,
        prerender: {
          outputPath: "/index.html",
        },
      },
    }),
    nitro({
      preset: "cloudflare_module",
      commands: {
        preview: "node ./node_modules/wrangler/bin/wrangler.js --cwd ./ dev --ip ::1",
      },
    }),
    viteReact(),
  ],
});