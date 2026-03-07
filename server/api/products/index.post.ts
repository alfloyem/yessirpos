import { defineEventHandler, createError, readBody } from 'h3'
import prisma from '../../utils/prisma'

export default defineEventHandler(async (event: any) => {
  try {
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
      parentProductId,
      createdAt
    } = body

    let finalProductName = productName
    
    // If it's a variant and productName is missing, fetch from parent
    if (parentProductId && !finalProductName) {
       const parent = await prisma.product.findUnique({ where: { id: parentProductId } })
       if (parent) {
         finalProductName = parent.productName || (parent as any).name
       }
    }

    // Validation
    if (!finalProductName) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Məhsul adı mütləqdir'
      })
    }

    if (barcode) {
      const existing = await (prisma as any).product.findUnique({ where: { barcode } })
      if (existing) {
        throw createError({
          statusCode: 409,
          statusMessage: 'Bu barkod artıq istifadə olunur'
        })
      }
    }

    const { user } = event.context

    const product = await (prisma as any).product.create({
      data: {
        productName: finalProductName,
        brandName: Array.isArray(brandName) ? JSON.stringify(brandName) : (brandName || null),
        category: Array.isArray(category) ? JSON.stringify(category) : (category || null),
        barcode,
        description,
        images: Array.isArray(images) ? JSON.stringify(images) : null,
        wholesalePrice: Number(wholesalePrice) || 0,
        retailPrice: Number(retailPrice) || 0,
        stock: Number(stock) || 0,
        reorderLevel: Number(reorderLevel) || 0,
        attribute: Array.isArray(attribute) ? JSON.stringify(attribute) : null,
        parentProductId: parentProductId || null,
        createdBy: user?.name || user?.username || 'Admin',
        createdAt: createdAt ? new Date(createdAt) : undefined
      }
    })

    const parsedProduct = {
      ...product,
      brandName: product.brandName ? (product.brandName.startsWith('[') ? JSON.parse(product.brandName) : [product.brandName]) : [],
      category: product.category ? (product.category.startsWith('[') ? JSON.parse(product.category) : [product.category]) : [],
      images: product.images ? (product.images.startsWith('[') ? JSON.parse(product.images) : []) : [],
      attribute: product.attribute ? (product.attribute.startsWith('[') ? JSON.parse(product.attribute) : []) : []
    }

    return parsedProduct
  } catch (error: any) {
    if (error.statusCode) throw error
    console.error('Product POST Error:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Məhsul əlavə edilərkən xəta baş verdi'
    })
  }
})
