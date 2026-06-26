import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// Proxy-Ziel (Backend) ist ueber VITE_API_PROXY konfigurierbar; Default = lokal.
// server.host = true macht den Dev-Server im LAN erreichbar (Test z.B. vom Handy).
export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, process.cwd(), '')
    const target = env.VITE_API_PROXY || 'http://127.0.0.1:8000'
    return {
        plugins: [react()],
        server: {
            host: true,
            allowedHosts: true,
            proxy: {
                '/api': target,
                '/auth': target,
                '/login': target,
                '/protected': target,
            },
        },
    }
})
