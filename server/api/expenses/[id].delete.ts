import { defineEventHandler, createError, getRouterParam } from 'h3'
import prisma from '../../utils/prisma'

export default defineEventHandler(async (event: any) => {
  const idStr = getRouterParam(event, 'id')
  const id = parseInt(idStr || '')
  if (isNaN(id)) {
    throw createError({ statusCode: 400, statusMessage: 'Yanlış xərc ID' })
  }

  try {
    await prisma.expense.delete({
      where: { id }
    })
    return { success: true }
  } catch (error) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Xərc silinərkən xəta baş verdi'
    })
  }
})
