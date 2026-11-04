import { loadEnvFile } from "node:process";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// Los tests de base de datos usan Supabase local (npx supabase start) y .env.local.
try {
  loadEnvFile(".env.local");
} catch {
  // En CI las variables llegan por entorno.
}

export default defineConfig({
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  test: {
    include: ["tests/**/*.test.ts"],
    environment: "node",
    fileParallelism: false,
  },
});
