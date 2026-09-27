import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    // 绑定所有网卡：浏览器可能不在本机（通过远程 GUI / 端口转发访问），
    // 只绑 127.0.0.1 会导致外部打不开。
    host: '0.0.0.0',
    port: 5273,
    strictPort: true,
    // 允许通过 IP 或代理主机名访问（Vite 默认会拦截非 localhost 的 Host 头）
    allowedHosts: true,
  },
  preview: {
    host: '0.0.0.0',
    port: 5273,
    strictPort: true,
    allowedHosts: true,
  },
  build: {
    target: 'es2022',
    chunkSizeWarningLimit: 1200,
  },
})
