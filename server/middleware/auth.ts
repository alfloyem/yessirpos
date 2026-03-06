import { defineEventHandler, createError, readBody, getRouterParam, getQuery, getCookie, getHeader } from 'h3'
import prisma from '../utils/prisma'

export default defineEventHandler(async (event: any) => {
  const url = event.node.req.url || ''

  // Public endpoints - auth kontrolü yapma
  const publicEndpoints = [
    '/api/auth/login',
    '/_nuxt',
    '/api/_content',
    '/favicon.ico',
    '/icon.svg',
    '/manifest.json'
  ]

  // Public endpoint kontrolü
  if (publicEndpoints.some(endpoint => url.startsWith(endpoint))) {
    return
  }

  // API endpoint'leri için token kontrolü
  if (url.startsWith('/api/')) {
    const authHeader = getHeader(event, 'authorization')
    const cookieToken = getCookie(event, 'auth-token')
    const token = authHeader?.replace('Bearer ', '') || cookieToken

    if (!token) {
      throw createError({
        statusCode: 401,
        statusMessage: 'Token bulunamadı'
      })
    }

    // Token formatını kontrol et
    if (!token.startsWith('mock-jwt-token-for-')) {
      throw createError({
        statusCode: 401,
        statusMessage: 'Geçersiz token formatı'
      })
    }

    // Token'dan user ID'yi çıkar
    const userId = parseInt(token.replace('mock-jwt-token-for-', ''))

    if (isNaN(userId)) {
      throw createError({
        statusCode: 401,
        statusMessage: 'Geçersiz token'
      })
    }

    // Kullanıcının hala veritabanında olup olmadığını kontrol et
    try {
      const user = await prisma.employee.findUnique({
        where: { id: userId },
        select: { id: true, username: true, firstName: true, lastName: true, role: true, status: true }
      })

      if (!user) {
        throw createError({
          statusCode: 401,
          statusMessage: 'Kullanıcı bulunamadı'
        })
      }

      if (user.status !== 'Aktif') {
        throw createError({
          statusCode: 403,
          statusMessage: 'Kullanıcı hesabı aktif değil'
        })
      }

      // Kullanıcı bilgisini event context'e ekle
      event.context.user = user
    } catch (error: any) {
      if (error.statusCode) throw error

      throw createError({
        statusCode: 500,
        statusMessage: 'Kullanıcı doğrulama hatası'
      })
    }
  }
})
