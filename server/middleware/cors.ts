import { defineEventHandler, setResponseHeader, getHeader } from 'h3'

export default defineEventHandler((event) => {
  const origin = getHeader(event, 'origin')
  
  // Tauri dev: http://localhost:1420
  // Windows/Linux Tauri prod: tauri://localhost
  // MacOS Tauri prod: tauri://localhost (or custom scheme)
  const allowedOrigins = [
    'http://localhost:1420',
    'http://localhost:3000',
    'tauri://localhost',
    'https://boss.musarzayev.com'
  ]

  if (origin && allowedOrigins.includes(origin)) {
    setResponseHeader(event, 'Access-Control-Allow-Origin', origin)
  } else if (!origin) {
    // If no origin, might be same-origin or a direct request, let it through.
  }

  setResponseHeader(event, 'Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  setResponseHeader(event, 'Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Set-Cookie')
  setResponseHeader(event, 'Access-Control-Allow-Credentials', 'true')

  // Handle preflight
  if (event.method === 'OPTIONS') {
    event.node.res.statusCode = 204
    event.node.res.end()
    return
  }
})
