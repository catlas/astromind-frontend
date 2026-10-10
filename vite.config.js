import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Политика за съдържанието (Фаза 14), вградена в страницата при production build. Скриптове само от самия сайт (ни един
// външен и ни един вграден скрипт), стилове и шрифтове само от Google Fonts, заявки само към API-то. Така код, вмъкнат в
// страницата, не може да се изпълни или да изпрати данни другаде. frame-ancestors не може да е в meta: за него и за HSTS
// трябва заглавия на хостинга (виж README.md, раздел „Заглавия за сигурност“).
const API_ORIGIN = process.env.VITE_API_URL || 'https://astromind-api.onrender.com'
const EXTRA_CONNECT = process.env.CSP_EXTRA_CONNECT || ''            // само за проверка на build локално (http://localhost:8000)

const csp = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com data:",
  "img-src 'self' data: blob:",
  `connect-src 'self' ${API_ORIGIN} ${EXTRA_CONNECT}`.trim(),
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-src 'none'",
  "worker-src 'self' blob:",
].join('; ')

const contentSecurityPolicy = () => ({
  name: 'content-security-policy',
  apply: 'build',
  transformIndexHtml: () => [
    { tag: 'meta', attrs: { 'http-equiv': 'Content-Security-Policy', content: csp }, injectTo: 'head-prepend' },
  ],
})

export default defineConfig({
  plugins: [react(), contentSecurityPolicy()],
  server: {
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, '')
      }
    }
  }
})
