import { defineEventHandler, setResponseHeaders, getHeader } from 'h3'

export default defineEventHandler((event) => {
  const origin = getHeader(event, 'origin')
  
  // Set CORS headers for all requests
  setResponseHeaders(event, {
    'Access-Control-Allow-Origin': origin || '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
    'Access-Control-Allow-Credentials': 'true',
  })

  // Handle preflight
  if (event.method === 'OPTIONS') {
    event.node.res.statusCode = 204
    event.node.res.end()
    return
  }
})
