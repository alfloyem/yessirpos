import { defineEventHandler, createError, readBody } from 'h3'
import prisma from '../../utils/prisma'
import { saveBase64Image } from '../../utils/image'

const processImages = async (images: any[], baseName: string, attributes?: any) => {
  if (!Array.isArray(images)) return []
  
  const results = []
  const safeBaseName = baseName || 'product'
  for (let i = 0; i < images.length; i++) {
    const img = images[i]
    if (img && typeof img === 'string' && img.startsWith('data:')) {
      // It's a new upload
      let filename = safeBaseName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
      if (attributes) {
        let attrValues: string[] = []
        if (Array.isArray(attributes)) {
          attrValues = attributes.filter(a => typeof a === 'string')
        } else if (typeof attributes === 'object' && attributes !== null) {
          attrValues = Object.values(attributes).filter(a => typeof a === 'string') as string[]
        }
        if (attrValues.length > 0) {
          filename += '_' + attrValues.map(a => a.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')).join('_')
        }
      }
      if (i > 0) filename += `-${i}`
      
      // Detect extension from data URI
      let ext = '.webp'
      if (img.startsWith('data:image/svg+xml')) ext = '.svg'
      else if (img.startsWith('data:image/png')) ext = '.png'
      else if (img.startsWith('data:image/jpeg')) ext = '.jpg'
      else if (img.startsWith('data:image/gif')) ext = '.gif'
      
      filename += ext
      
      const savedPath = await saveBase64Image(img, filename)
      if (savedPath) results.push(savedPath)
    } else {
      // It's already a path
      results.push(img)
    }
  }
  return results
}

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

    const processedImages = await processImages(images, finalProductName, attribute)

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
        images: Array.isArray(processedImages) ? JSON.stringify(processedImages) : null,
        wholesalePrice: Number(wholesalePrice) || 0,
        retailPrice: Number(retailPrice) || 0,
        stock: Number(stock) || 0,
        reorderLevel: Number(reorderLevel) || 0,
        attribute: typeof attribute === 'object' && attribute !== null ? JSON.stringify(attribute) : (attribute || null),
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
      attribute: product.attribute ? ((product.attribute.startsWith('[') || product.attribute.startsWith('{')) ? JSON.parse(product.attribute) : product.attribute) : null
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
