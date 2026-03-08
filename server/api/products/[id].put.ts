import { defineEventHandler, createError, readBody, getRouterParam } from 'h3'
import prisma from '../../utils/prisma'
import { saveBase64Image } from '../../utils/image'

const processImages = async (images: any[], baseName: string, attributes?: any) => {
  if (!Array.isArray(images)) return []
  
  const results = []
  const safeBaseName = baseName || 'product'
  for (let i = 0; i < images.length; i++) {
    const img = images[i]
    if (img && typeof img === 'string' && img.startsWith('data:')) {
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
      
      let ext = '.webp'
      if (img.startsWith('data:image/svg+xml')) ext = '.svg'
      else if (img.startsWith('data:image/png')) ext = '.png'
      else if (img.startsWith('data:image/jpeg')) ext = '.jpg'
      else if (img.startsWith('data:image/gif')) ext = '.gif'
      
      filename += ext
      
      const savedPath = await saveBase64Image(img, filename)
      if (savedPath) results.push(savedPath)
    } else {
      results.push(img)
    }
  }
  return results
}

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

    const processedImages = images !== undefined ? await processImages(images, productName || '', attribute) : undefined

    const dataToUpdate: any = {}
    if (productName !== undefined) dataToUpdate.productName = productName
    if (brandName !== undefined) dataToUpdate.brandName = Array.isArray(brandName) ? JSON.stringify(brandName) : (brandName || null)
    if (category !== undefined) dataToUpdate.category = Array.isArray(category) ? JSON.stringify(category) : (category || null)
    if (barcode !== undefined) dataToUpdate.barcode = barcode
    if (description !== undefined) dataToUpdate.description = description
    if (processedImages !== undefined) dataToUpdate.images = Array.isArray(processedImages) ? JSON.stringify(processedImages) : null
    if (wholesalePrice !== undefined) dataToUpdate.wholesalePrice = Number(wholesalePrice)
    if (retailPrice !== undefined) dataToUpdate.retailPrice = Number(retailPrice)
    if (stock !== undefined) dataToUpdate.stock = Number(stock)
    if (reorderLevel !== undefined) dataToUpdate.reorderLevel = Number(reorderLevel)
    if (attribute !== undefined) dataToUpdate.attribute = typeof attribute === 'object' && attribute !== null ? JSON.stringify(attribute) : (attribute || null)
    if (parentProductId !== undefined) dataToUpdate.parentProductId = parentProductId || null

    const updated = await (prisma as any).product.update({
      where: { id },
      data: dataToUpdate
    })

    const parsedUpdated = {
      ...updated,
      brandName: updated.brandName ? (updated.brandName.startsWith('[') ? JSON.parse(updated.brandName) : [updated.brandName]) : [],
      category: updated.category ? (updated.category.startsWith('[') ? JSON.parse(updated.category) : [updated.category]) : [],
      images: updated.images ? (updated.images.startsWith('[') ? JSON.parse(updated.images) : []) : [],
      attribute: updated.attribute ? ((updated.attribute.startsWith('[') || updated.attribute.startsWith('{')) ? JSON.parse(updated.attribute) : updated.attribute) : null
    }

    return parsedUpdated
  } catch (error: any) {
    if (error.statusCode) throw error
    console.error('Product PUT Error:', error)
    throw createError({ statusCode: 500, statusMessage: 'Yeniləyərkən xəta baş verdi' })
  }
})
