import { defineEventHandler, createError, readBody, getRouterParam, getQuery, getCookie, getHeader } from 'h3'
export default defineEventHandler(async (event: any) => {
  // Server middleware zaten user'ı doğruladı ve context'e ekledi
  const user = event.context.user

  if (!user) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Kullanıcı doğrulanamadı'
    })
  }

  return {
    valid: true,
    user: {
      id: user.id,
      username: user.username,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      status: user.status
    }
  }
})
