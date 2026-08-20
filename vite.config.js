import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Backend CORS (app/main.py) currently allows only http://localhost:3000
// and http://localhost:8080, so the dev server is pinned to port 3000.
// If you'd rather use Vite's default port (5173), add it to the
// `allow_origins` list in the backend's CORSMiddleware config instead.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
  },
});
