import { defineEventHandler, createError, readBody } from 'h3'
import prisma from '../../utils/prisma'

export default defineEventHandler(async (event: any) => {
  try {
    const { ids, updates } = await readBody(event)
    if (!Array.isArray(ids) || ids.length === 0 || !updates) {
      throw createError({ statusCode: 400, statusMessage: 'Seçilmiş ID və ya yenilənmə məlumatı yoxdur' })
    }

    // Data transformation for updates
    const data: any = { ...updates }
    if (data.brandName !== undefined) data.brandName = Array.isArray(data.brandName) ? JSON.stringify(data.brandName) : data.brandName
    if (data.category !== undefined) data.category = Array.isArray(data.category) ? JSON.stringify(data.category) : data.category
    if (data.images !== undefined) data.images = Array.isArray(data.images) ? JSON.stringify(data.images) : data.images
    if (data.attribute !== undefined) data.attribute = Array.isArray(data.attribute) ? JSON.stringify(data.attribute) : data.attribute
    
    if (data.wholesalePrice !== undefined) data.wholesalePrice = Number(data.wholesalePrice)
    if (data.retailPrice !== undefined) data.retailPrice = Number(data.retailPrice)
    if (data.stock !== undefined) data.stock = Number(data.stock)
    if (data.reorderLevel !== undefined) data.reorderLevel = Number(data.reorderLevel)

    await prisma.product.updateMany({
      where: { id: { in: ids } },
      data
    })

    return { success: true, count: ids.length }
  } catch (error: any) {
    console.error('Product Bulk UPDATE Error:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Məhsullar yenilənərkən xəta baş verdi'
    })
  }
})
