import { defineEventHandler, createError, readBody } from 'h3'
import prisma from '../../utils/prisma'
import { deleteImages } from '../../utils/image'

export default defineEventHandler(async (event: any) => {
  try {
    const { ids } = await readBody(event)
    if (!Array.isArray(ids) || ids.length === 0) {
      throw createError({ statusCode: 400, statusMessage: 'Seçilmiş ID yoxdur' })
    }

    // Fetch all images (product + variants) before deleting
    const products = await (prisma as any).product.findMany({
      where: { id: { in: ids } },
      select: { images: true, variants: { select: { images: true } } }
    })

    await prisma.product.deleteMany({ where: { id: { in: ids } } })

    // Delete images from disk
    for (const product of products) {
      await deleteImages(product.images)
      for (const variant of product.variants ?? []) {
        await deleteImages(variant.images)
      }
    }

    return { success: true, count: ids.length }
  } catch (error: any) {
    console.error('Product Bulk DELETE Error:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Məhsullar silinərkən xəta baş verdi'
    })
  }
})
