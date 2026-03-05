export default defineEventHandler(async (event) => {
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
      status: user.status
    }
  }
})
