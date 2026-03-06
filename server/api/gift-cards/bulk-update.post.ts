import { defineEventHandler, createError, readBody, getRouterParam, getQuery, getCookie, getHeader } from 'h3'
import prisma from '../../utils/prisma'

export default defineEventHandler(async (event: any) => {
  try {
    const body = await readBody(event)
    const { ids, updates } = body
    if (!ids || !Array.isArray(ids) || ids.length === 0) throw createError({ statusCode: 400, statusMessage: 'Yalnış ID' })
    
    if (!updates || typeof updates !== 'object') {
      throw createError({
        statusCode: 400,
        statusMessage: 'Yeniləmə məlumatları daxil edilməlidir'
      })
    }
    
    const updateData: any = {}
    if (updates.value !== undefined) updateData.value = parseFloat(updates.value)
    if (updates.customer) updateData.customerId = parseInt(updates.customer)

    const result = await prisma.giftCard.updateMany({
      where: { id: { in: ids } },
      data: updateData
    })
    return { success: true, count: result.count }
  } catch (error) {
    throw createError({ statusCode: 500, statusMessage: 'Yenilənərkən xəta baş verdi' })
  }
})
