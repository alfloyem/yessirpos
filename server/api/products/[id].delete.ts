import { defineEventHandler, createError, getRouterParam } from 'h3'
import prisma from '../../utils/prisma'

export default defineEventHandler(async (event: any) => {
  try {
    const id = parseInt(getRouterParam(event, 'id') || '0')
    if (!id) throw createError({ statusCode: 400, statusMessage: 'Yalnış ID' })

    await prisma.product.delete({
      where: { id }
    })

    return { 
      success: true, 
      message: 'Məhsul silindi' 
    }
  } catch (error: any) {
    console.error('Product DELETE Error:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Məhsul silinərkən xəta baş verdi'
    })
  }
})
