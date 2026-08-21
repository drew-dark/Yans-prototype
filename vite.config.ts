import { defineConfig } from "vite";
import { devtools } from "@tanstack/devtools-vite";
import tailwindcss from "@tailwindcss/vite";
import tsConfigPaths from "vite-tsconfig-paths";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import { nitro } from "nitro/vite";
import viteReact from "@vitejs/plugin-react";

// Standalone Vite config (previously wrapped by @lovable.dev/vite-tanstack-config,
// which has been removed). This replicates, for a normal non-sandboxed environment,
// the plugin set that wrapper assembled: TanStack devtools (dev-only), Tailwind,
// tsconfig path aliases, TanStack Start, Nitro (build-only, Cloudflare preset),
// React, and matching dedupe/watch settings. The Lovable-sandbox-only pieces
// (asset proxy, HMR gate, dev-server bridge, bundled-dev CSS shim, build error
// diagnostics) are intentionally not replicated — they were no-ops outside the
// Lovable sandbox to begin with.
export default defineConfig(({ command, mode }) => ({
  css: { transformer: "lightningcss" },
  resolve: {
    // "@" -> ./src comes from tsconfig.json's `paths`, picked up by tsConfigPaths below.
    dedupe: [
      "react",
      "react-dom",
      "react/jsx-runtime",
      "react/jsx-dev-runtime",
      "@tanstack/react-query",
      "@tanstack/query-core",
    ],
  },
  optimizeDeps: {
    include: ["react", "react-dom", "react-dom/client", "react/jsx-runtime", "react/jsx-dev-runtime"],
    ignoreOutdatedRequests: true,
  },
  server: {
    host: "::",
    port: 8080,
    watch: {
      // Helps HMR stay reliable on networked/virtualized filesystems (e.g. Codespaces).
      awaitWriteFinish: { stabilityThreshold: 1000, pollInterval: 100 },
    },
  },
  plugins: [
    mode === "development" &&
      devtools({
        logging: false,
        eventBusConfig: { enabled: false },
        enhancedLogs: { enabled: false },
        consolePiping: { enabled: false },
        removeDevtoolsOnBuild: false,
        injectSource: { enabled: true },
      }),
    tailwindcss(),
    tsConfigPaths({ projects: ["./tsconfig.json"] }),
    tanstackStart({
      importProtection: {
        behavior: "error",
        client: { files: ["**/server/**"], specifiers: ["server-only"] },
      },
      // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
      server: { entry: "server" },
    }),
    command === "build" && nitro({ defaultPreset: "cloudflare-module" }),
    viteReact(),
  ],
}));
