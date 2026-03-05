import prisma from '../../utils/prisma'
import bcrypt from 'bcryptjs'

export default defineEventHandler(async (event) => {
  try {
    const id = parseInt(getRouterParam(event, 'id') || '0')
    const body = await readBody(event)
    const { firstName, lastName, username, email, phone, gender, status, password, notes } = body

    if (!id) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Geçersiz ID'
      })
    }

    // Mevcut çalışanı kontrol et
    const existingEmployee = await prisma.employee.findUnique({
      where: { id }
    })

    if (!existingEmployee) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Çalışan bulunamadı'
      })
    }

    // Username değişmişse ve başka biri kullanıyorsa hata ver
    if (username && username !== existingEmployee.username) {
      const usernameExists = await prisma.employee.findUnique({
        where: { username }
      })

      if (usernameExists) {
        throw createError({
          statusCode: 409,
          statusMessage: 'Bu kullanıcı adı zaten kullanılıyor'
        })
      }
    }

    // Güncelleme verilerini hazırla
    const updateData: any = {}
    if (firstName) updateData.firstName = firstName
    if (lastName) updateData.lastName = lastName
    if (username) updateData.username = username
    if (email !== undefined) updateData.email = email
    if (phone !== undefined) updateData.phone = phone
    if (gender !== undefined) updateData.gender = gender
    if (status !== undefined) updateData.status = status
    if (notes !== undefined) updateData.notes = notes

    // Şifre değiştiriliyorsa hashle
    if (password) {
      if (password.length < 8) {
        throw createError({
          statusCode: 400,
          statusMessage: 'Şifre en az 8 karakter olmalıdır'
        })
      }
      updateData.password = await bcrypt.hash(password, 10)
    }

    // Çalışanı güncelle
    const employee = await prisma.employee.update({
      where: { id },
      data: updateData,
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
      statusMessage: 'Çalışan güncellenirken hata oluştu'
    })
  }
})
