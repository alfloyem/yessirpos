import { defineEventHandler, createError, readBody } from 'h3'
import prisma from '../../utils/prisma'

export default defineEventHandler(async (event: any) => {
  const body = await readBody(event)
  const ids = body.ids
  if (!Array.isArray(ids)) {
    throw createError({ statusCode: 400, statusMessage: 'Yanlış məlumat formatı' })
  }

  try {
    await prisma.expense.deleteMany({
      where: {
        id: { in: ids }
      }
    })
    return { success: true }
  } catch (error) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Xərclər silinərkən xəta baş verdi'
    })
  }
})
