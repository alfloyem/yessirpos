import { defineEventHandler, createError } from 'h3'
import prisma from '../../utils/prisma'

export default defineEventHandler(async (event: any) => {
  try {
    const expenses = await prisma.expense.findMany({
      orderBy: {
        date: 'desc'
      }
    })

    return expenses
  } catch (error) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Xərclər yüklənərkən xəta baş verdi'
    })
  }
})
