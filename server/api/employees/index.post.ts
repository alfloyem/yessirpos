import { defineEventHandler, createError, readBody, getRouterParam, getQuery, getCookie, getHeader } from 'h3'
import prisma from '../../utils/prisma'
import bcrypt from 'bcryptjs'

export default defineEventHandler(async (event: any) => {
  try {
    const body = await readBody(event)
    const { firstName, lastName, username, email, phone, gender, role, status, password, notes, notAllowed } = body

    // Validasyon
    if (!firstName || !lastName || !username || !password) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Ad, soyad, kullanıcı adı ve şifre zorunludur'
      })
    }

    if (password.length < 8) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Şifre en az 8 karakter olmalıdır'
      })
    }

    // Username benzersizliğini kontrol et
    const existingEmployee = await prisma.employee.findUnique({
      where: { username }
    })

    if (existingEmployee) {
      throw createError({
        statusCode: 409,
        statusMessage: 'Bu kullanıcı adı zaten kullanılıyor'
      })
    }

    // Şifreyi hashle
    const hashedPassword = await bcrypt.hash(password, 10)

    // Yeni çalışan oluştur
    const employee = await prisma.employee.create({
      data: {
        firstName,
        lastName,
        username,
        email,
        phone,
        gender,
        role: role ? JSON.stringify(role) : null,
        notAllowed: notAllowed ? JSON.stringify(notAllowed) : null,
        status: status || 'Aktif',
        password: hashedPassword,
        notes
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        username: true,
        email: true,
        phone: true,
        gender: true,
        role: true,
        status: true,
        notes: true,
        notAllowed: true,
        createdAt: true,
        updatedAt: true
      }
    })

    return {
      ...employee,
      role: employee.role ? JSON.parse(employee.role) : [],
      notAllowed: employee.notAllowed ? JSON.parse(employee.notAllowed) : []
    }
  } catch (error: any) {
    if (error.statusCode) throw error
    
    throw createError({
      statusCode: 500,
      statusMessage: 'Çalışan eklenirken hata oluştu'
    })
  }
})
