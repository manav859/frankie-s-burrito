import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const configuredWordPressTarget = (env.WORDPRESS_BASE_URL || env.VITE_WORDPRESS_BASE_URL || 'http://localhost:8080').replace(
    /\/$/,
    '',
  )
  const wordpressTarget = mode === 'development' ? 'http://localhost:8080' : configuredWordPressTarget
  const base = env.VITE_SITE_BASE_PATH || '/'

  return {
    base,
    plugins: [react()],
    server: {
      allowedHosts: ['caissoned-kailani-archaically.ngrok-free.dev'],
      proxy: {
        '/wp-json': {
          target: wordpressTarget,
          changeOrigin: true,
        },
        '/wp-content': {
          target: wordpressTarget,
          changeOrigin: true,
        },
        '/wp-includes': {
          target: wordpressTarget,
          changeOrigin: true,
        },
      },
    },
  }
})
