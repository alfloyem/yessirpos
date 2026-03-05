import prisma from '../../utils/prisma'
import bcrypt from 'bcryptjs'

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event)
    const { firstName, lastName, username, email, phone, gender, status, password, notes } = body

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
        status: true,
        notes: true,
        createdAt: true,
        updatedAt: true
      }
    })

    return employee
  } catch (error: any) {
    if (error.statusCode) throw error
    
    throw createError({
      statusCode: 500,
      statusMessage: 'Çalışan eklenirken hata oluştu'
    })
  }
})
