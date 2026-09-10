import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [react(), tsconfigPaths()],
  server: {
    port: 5173,
  },
  preview: {
    allowedHosts: "all",
  },
  build: {
    outDir: "dist",
  },
  test: {
    environment: "node",
    include: ["test/**/*.test.ts"],
  },
});