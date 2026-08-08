import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // Lets `vite dev` talk to the Vercel functions when using `vercel dev`
      // alongside it. Not required for production (same-origin on Vercel).
    }
  }
});
