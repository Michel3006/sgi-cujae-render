import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { apiDebugLoggerPlugin } from './vite.plugins/apiDebugLogger'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    apiDebugLoggerPlugin(),
    react({
      babel: {
        plugins: [['babel-plugin-react-compiler']],
      },
    }),
  ],
})
