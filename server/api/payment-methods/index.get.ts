import { defineEventHandler, createError } from 'h3'
import prisma from '../../utils/prisma'

export default defineEventHandler(async (event) => {
  try {
    return await prisma.paymentMethod.findMany({
      orderBy: {
        createdAt: 'asc'
      }
    })
  } catch (error) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Ödəniş üsulları yüklənərkən xəta baş verdi'
    })
  }
})
