import { defineEventHandler, createError, getCookie, getHeader, setResponseHeaders } from 'h3'
import { verifyToken } from '../utils/jwt'

export default defineEventHandler(async (event) => {
  // 1. OPTIONS (Preflight) isteklerini direkt geçirmeliyiz
  if (event.method === 'OPTIONS') {
    setResponseHeaders(event, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET,HEAD,PUT,PATCH,POST,DELETE',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    })
    return
  }

  const url = event.node.req.url || ''

  const publicEndpoints = [
    '/api/auth/login',
    '/_nuxt',
    '/favicon.ico',
    '/icon.svg',
    '/manifest.json',
  ]

  if (publicEndpoints.some(endpoint => url.startsWith(endpoint))) return

  if (!url.startsWith('/api/')) return

  const authHeader = getHeader(event, 'authorization')
  const cookieToken = getCookie(event, 'auth-token')
  const token = authHeader?.replace(/^[Bb]earer\s+/, '') || cookieToken

  if (!token) {
    throw createError({ statusCode: 401, statusMessage: 'Token tapılmadı' })
  }

  try {
    const payload = verifyToken(token)
    event.context.user = payload
  } catch {
    throw createError({ statusCode: 401, statusMessage: 'Token etibarsızdır və ya müddəti bitib' })
  }
})
