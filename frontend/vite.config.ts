import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
    plugins: [react()],
    server: {
        proxy: {
            // hit http://localhost:5173/api/auth/login → forwarded to the auth service
            '/api': {
                target: 'http://localhost:8084', // <— replace with the REAL auth port if different
                changeOrigin: true,
                rewrite: (path) => path.replace(/^\/api/, ''),
            },
        },
    },
})
