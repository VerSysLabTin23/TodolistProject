import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
    plugins: [react()],
    server: {
        proxy: {
            // auth service (8084)
            '/api': {
                target: 'http://localhost:8084',
                changeOrigin: true,
                rewrite: (p) => p.replace(/^\/api/, ''),
            },
            // team service (8083)
            '/team-api': {
                target: 'http://localhost:8083',
                changeOrigin: true,
                rewrite: (p) => p.replace(/^\/team-api/, ''),
            },
            // task service (8081)
            '/task-api': {
                target: 'http://localhost:8081',
                changeOrigin: true,
                rewrite: (p) => p.replace(/^\/task-api/, ''),
            },
            '/ws': {
                target: 'ws://localhost:8090',
                ws: true,
                changeOrigin: true },
        },
    },
})