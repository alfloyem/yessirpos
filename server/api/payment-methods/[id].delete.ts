import { defineEventHandler, createError, getRouterParam } from 'h3'
import prisma from '../../utils/prisma'

export default defineEventHandler(async (event) => {
  try {
    const id = parseInt(getRouterParam(event, 'id') || '0')

    const method = await prisma.paymentMethod.findUnique({ where: { id } })
    if (method?.isSystem) {
      throw createError({
        statusCode: 403,
        statusMessage: 'Sistem tərəfindən qorunan ödəniş üsulunu silmək olmaz'
      })
    }

    return await prisma.paymentMethod.delete({
      where: { id }
    })
  } catch (error: any) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Ödəniş üsulu silinərkən xəta baş verdi'
    })
  }
})
