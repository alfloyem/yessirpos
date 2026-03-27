import { defineEventHandler, createError, readBody } from 'h3'
import bcrypt from 'bcryptjs'
import prisma from '../../utils/prisma'
import { signToken } from '../../utils/jwt'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { username, password } = body

  if (!username || !password) {
    throw createError({ statusCode: 400, statusMessage: 'İstifadəçi adı və şifrə mütləqdir' })
  }

  const employee = await prisma.employee.findUnique({ where: { username } })

  if (!employee) {
    throw createError({ statusCode: 401, statusMessage: 'İstifadəçi adı və ya şifrə səhvdir' })
  }

  const isPasswordValid = await bcrypt.compare(password, employee.password)

  if (!isPasswordValid) {
    throw createError({ statusCode: 401, statusMessage: 'İstifadəçi adı və ya şifrə səhvdir' })
  }

  if (employee.status !== 'Aktif') {
    throw createError({ statusCode: 403, statusMessage: 'Hesab aktiv deyil' })
  }

  const notAllowed = employee.notAllowed ? JSON.parse(employee.notAllowed) : []
  const token = signToken({ id: employee.id, username: employee.username, role: employee.role, notAllowed })

  return {
    token,
    user: {
      id: employee.id,
      username: employee.username,
      firstName: employee.firstName,
      lastName: employee.lastName,
      email: employee.email,
      role: employee.role,
      notAllowed: notAllowed
    }
  }
})
