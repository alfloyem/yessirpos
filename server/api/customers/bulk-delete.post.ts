import prisma from '../../utils/prisma'

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event)
    const { ids } = body

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Yalnış ID siyahısı'
      })
    }

    const result = await prisma.customer.deleteMany({
      where: {
        id: {
          in: ids
        }
      }
    })

    return { 
      success: true, 
      message: `${result.count} müştəri silindi`,
      count: result.count
    }
  } catch (error: any) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Müştərilər silinərkən xəta baş verdi'
    })
  }
})
