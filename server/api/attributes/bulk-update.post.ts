import { defineEventHandler, createError, readBody } from 'h3'
import prisma from '../../utils/prisma'

export default defineEventHandler(async (event: any) => {
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

    const numericIds = ids.map((id: any) => parseInt(id)).filter((id: number) => !isNaN(id))

    const result = await (prisma as any).attribute.updateMany({
      where: {
        id: { in: numericIds }
      },
      data: updateData
    })

    return { 
      success: true, 
      count: result.count
    }
  } catch (error: any) {
    console.error('Attribute Bulk Update Error:', error)
    if (error.statusCode) throw error
    throw createError({
      statusCode: 500,
      statusMessage: 'Atributlar yenilənərkən xəta baş verdi: ' + (error.message || '')
    })
  }
})
