import { defineEventHandler, createError, readBody, getRouterParam } from 'h3'
import prisma from '../../utils/prisma'

export default defineEventHandler(async (event: any) => {
  try {
    const id = parseInt(getRouterParam(event, 'id') || '0')
    const body = await readBody(event)
    const { 
      productName, 
      brandName, 
      category, 
      barcode, 
      description, 
      images, 
      wholesalePrice, 
      retailPrice, 
      stock, 
      reorderLevel, 
      attribute,
      parentProductId
    } = body

    if (!id) throw createError({ statusCode: 400, statusMessage: 'Yalnış ID' })

    if (barcode) {
      const existing = await (prisma as any).product.findFirst({
        where: { barcode, id: { not: id } }
      })
      if (existing) {
        throw createError({ statusCode: 409, statusMessage: 'Bu barkod artıq istifadə olunur' })
      }
    }

    const updated = await (prisma as any).product.update({
      where: { id },
      data: {
        productName,
        brandName: Array.isArray(brandName) ? JSON.stringify(brandName) : (brandName || null),
        category: Array.isArray(category) ? JSON.stringify(category) : (category || null),
        barcode,
        description,
        images: Array.isArray(images) ? JSON.stringify(images) : (images || null),
        wholesalePrice: Number(wholesalePrice),
        retailPrice: Number(retailPrice),
        stock: Number(stock),
        reorderLevel: Number(reorderLevel),
        attribute: Array.isArray(attribute) ? JSON.stringify(attribute) : (attribute || null),
        parentProductId: parentProductId || null
      }
    })

    return updated
  } catch (error: any) {
    if (error.statusCode) throw error
    console.error('Product PUT Error:', error)
    throw createError({ statusCode: 500, statusMessage: 'Yeniləyərkən xəta baş verdi' })
  }
})
