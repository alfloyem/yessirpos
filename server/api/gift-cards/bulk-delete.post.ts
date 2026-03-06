import { defineEventHandler, createError, readBody, getRouterParam, getQuery, getCookie, getHeader } from 'h3'
import prisma from '../../utils/prisma'

export default defineEventHandler(async (event: any) => {
  try {
    const body = await readBody(event)
    const { ids } = body
    if (!ids || !Array.isArray(ids) || ids.length === 0) throw createError({ statusCode: 400, statusMessage: 'Yalnış ID' })
    const result = await prisma.giftCard.deleteMany({ where: { id: { in: ids } } })
    return { success: true, count: result.count }
  } catch (error) {
    throw createError({ statusCode: 500, statusMessage: 'Silinərkən xəta baş verdi' })
  }
})
