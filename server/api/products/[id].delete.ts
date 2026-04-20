import { defineEventHandler, createError, getRouterParam } from 'h3'
import prisma from '../../utils/prisma'
import { deleteImages } from '../../utils/image'

export default defineEventHandler(async (event: any) => {
  try {
    const id = parseInt(getRouterParam(event, 'id') || '0')
    if (!id) throw createError({ statusCode: 400, statusMessage: 'Yalnış ID' })

    // Fetch images before deleting so we can clean up files
    const product = await (prisma as any).product.findUnique({
      where: { id },
      select: { images: true, variants: { select: { id: true, images: true } } }
    })

    await prisma.product.delete({ where: { id } })

    // Delete images from disk (product + all its variants)
    if (product) {
      await deleteImages(product.images)
      for (const variant of product.variants ?? []) {
        await deleteImages(variant.images)
      }
    }

    return { success: true, message: 'Məhsul silindi' }
  } catch (error: any) {
    if (error.statusCode) throw error
    console.error('Product DELETE Error:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Məhsul silinərkən xəta baş verdi'
    })
  }
})
