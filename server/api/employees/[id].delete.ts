import { defineEventHandler, createError, readBody, getRouterParam, getQuery, getCookie, getHeader } from 'h3'
import prisma from '../../utils/prisma'

export default defineEventHandler(async (event: any) => {
  try {
    const id = parseInt(getRouterParam(event, 'id') || '0')

    if (!id) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Geçersiz ID'
      })
    }

    // Çalışanı sil
    await prisma.employee.delete({
      where: { id }
    })

    return { success: true, message: 'Çalışan silindi' }
  } catch (error: any) {
    if (error.code === 'P2025') {
      throw createError({
        statusCode: 404,
        statusMessage: 'Çalışan bulunamadı'
      })
    }

    throw createError({
      statusCode: 500,
      statusMessage: 'Çalışan silinirken hata oluştu'
    })
  }
})
