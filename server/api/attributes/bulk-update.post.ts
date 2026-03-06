import prisma from '../../utils/prisma'

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event)
    const { ids, updates } = body

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Yalnış ID siyahısı'
      })
    }

    const updateData: any = {}
    if (updates.name) updateData.name = updates.name
    if (updates.values && Array.isArray(updates.values)) updateData.values = JSON.stringify(updates.values)

    const result = await (prisma as any).attribute.updateMany({
      where: {
        id: { in: ids }
      },
      data: updateData
    })

    return { 
      success: true, 
      count: result.count
    }
  } catch (error: any) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Atributlar yenilənərkən xəta baş verdi'
    })
  }
})
