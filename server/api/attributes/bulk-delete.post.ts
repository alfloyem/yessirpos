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

    const result = await (prisma as any).attribute.deleteMany({
      where: {
        id: { in: ids }
      }
    })

    return { 
      success: true, 
      count: result.count
    }
  } catch (error: any) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Atributlar silinərkən xəta baş verdi'
    })
  }
})
