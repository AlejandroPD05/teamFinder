import { loadEnvFile } from "node:process";
import { defineConfig, devices } from "@playwright/test";

try {
  loadEnvFile(".env.local");
} catch {
  // En CI las variables llegan por entorno.
}

// Necesita Supabase local en marcha (npx supabase start). Arranca la app en producción local.
export default defineConfig({
  // Los flujos e2e recorren varias páginas contra Supabase local: 60 s de margen cuando la máquina va cargada.
  timeout: 60_000,
  testDir: "e2e",
  fullyParallel: false,
  // Un solo servidor de Next y una sola base local: con más procesos en paralelo se saturan y salen fallos falsos.
  workers: 4,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: { baseURL: "http://127.0.0.1:3000", trace: "retain-on-failure" },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["Pixel 7"] } },
  ],
  webServer: {
    command: "npm run build && npm run start -- -H 127.0.0.1 -p 3000",
    url: "http://127.0.0.1:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 240_000,
  },
});
