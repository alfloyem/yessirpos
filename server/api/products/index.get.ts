import { defineEventHandler, createError } from 'h3'
import prisma from '../../utils/prisma'

export default defineEventHandler(async (event: any) => {
  try {
    const products = await (prisma as any).product.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        variants: true
      }
    })

    // Parse JSON strings back into arrays/objects
    return products.map((p: any) => ({
      ...p,
      brandName: p.brandName ? (p.brandName.startsWith('[') ? JSON.parse(p.brandName) : [p.brandName]) : [],
      category: p.category ? (p.category.startsWith('[') ? JSON.parse(p.category) : [p.category]) : [],
      images: p.images ? (p.images.startsWith('[') ? JSON.parse(p.images) : []) : [],
      attribute: p.attribute ? ((p.attribute.startsWith('[') || p.attribute.startsWith('{')) ? JSON.parse(p.attribute) : p.attribute) : null
    }))
  } catch (error: any) {
    console.error('Product GET Error:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Məhsullar yüklənərkən xəta baş verdi'
    })
  }
})
