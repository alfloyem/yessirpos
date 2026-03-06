import { defineEventHandler, createError, readBody } from 'h3'
import prisma from '../../utils/prisma'

export default defineEventHandler(async (event: any) => {
  try {
    const { ids } = await readBody(event)
    if (!Array.isArray(ids) || ids.length === 0) {
      throw createError({ statusCode: 400, statusMessage: 'Seçilmiş ID yoxdur' })
    }

    await prisma.product.deleteMany({
      where: { id: { in: ids } }
    })

    return { 
      success: true, 
      count: ids.length 
    }
  } catch (error: any) {
    console.error('Product Bulk DELETE Error:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Məhsullar silinərkən xəta baş verdi'
    })
  }
})
