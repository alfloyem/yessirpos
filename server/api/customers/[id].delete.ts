import prisma from '../../utils/prisma'

export default defineEventHandler(async (event) => {
  try {
    const id = parseInt(getRouterParam(event, 'id') || '0')

    if (!id) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Yalnış ID'
      })
    }

    await prisma.customer.delete({
      where: { id }
    })

    return { success: true, message: 'Müştəri silindi' }
  } catch (error: any) {
    if (error.code === 'P2025') {
      throw createError({
        statusCode: 404,
        statusMessage: 'Müştəri tapılmadı'
      })
    }

    throw createError({
      statusCode: 500,
      statusMessage: 'Müştəri silinərkən xəta baş verdi'
    })
  }
})
