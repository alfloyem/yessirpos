import prisma from '../../utils/prisma'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { email, password } = body

  // DB'de kullanıcıyı ara
  const user = await prisma.user.findFirst({
    where: {
      email,
      password // Not: Normalde password hash kontrolü yapılır (bcrypt vb.)
    },
  })

  if (!user) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Invalid credentials',
    })
  }

  // Token dön (Sizin durumunuzda basit bir mock token dönüyoruz)
  return {
    token: 'mock-jwt-token-for-' + user.id,
    user: {
      id: user.id,
      email: user.email,
      name: user.name
    }
  }
})
