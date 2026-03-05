export default defineEventHandler(async (event) => {
  const authHeader = getHeader(event, 'authorization')
  const token = authHeader?.replace('Bearer ', '')

  if (!token) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Token bulunamadı'
    })
  }

  // Basit token kontrolü (gerçek uygulamada JWT verify kullanılmalı)
  if (!token.startsWith('mock-jwt-token-for-')) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Geçersiz token'
    })
  }

  return {
    valid: true,
    message: 'Token geçerli'
  }
})
