import { defineEventHandler, createError, getRouterParam } from 'h3'
import prisma from '../../utils/prisma'

export default defineEventHandler(async (event) => {
  try {
    const id = parseInt(getRouterParam(event, 'id') || '0')

    if (!id) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Yalnış ID'
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
