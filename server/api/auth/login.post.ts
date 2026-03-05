import prisma from '../../utils/prisma'
import bcrypt from 'bcryptjs'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { username, password } = body

  if (!username || !password) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Kullanıcı adı ve şifre gerekli'
    })
  }

  // DB'de çalışanı ara
  const employee = await prisma.employee.findUnique({
    where: { username }
  })

  if (!employee) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Kullanıcı adı veya şifre hatalı'
    })
  }

  // Şifreyi kontrol et
  const isPasswordValid = await bcrypt.compare(password, employee.password)

  if (!isPasswordValid) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Kullanıcı adı veya şifre hatalı'
    })
  }

  // Token dön
  return {
    token: 'mock-jwt-token-for-' + employee.id,
    user: {
      id: employee.id,
      username: employee.username,
      firstName: employee.firstName,
      lastName: employee.lastName,
      email: employee.email
    }
  }
})
