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

    if (!updates || typeof updates !== 'object') {
      throw createError({
        statusCode: 400,
        statusMessage: 'Yeniləmə məlumatları daxil edilməlidir'
      })
    }

    const updateData: any = {}
    if (updates.firstName) updateData.firstName = updates.firstName
    if (updates.lastName) updateData.lastName = updates.lastName
    if (updates.email !== undefined) updateData.email = updates.email
    if (updates.phone !== undefined) updateData.phone = updates.phone
    if (updates.gender !== undefined) updateData.gender = updates.gender
    if (updates.role !== undefined) updateData.role = Array.isArray(updates.role) ? JSON.stringify(updates.role) : (updates.role || '')
    if (updates.status !== undefined) updateData.status = updates.status
    if (updates.notes !== undefined) updateData.notes = updates.notes

    const numericIds = ids.map((id: any) => parseInt(id)).filter((id: number) => !isNaN(id))

    if (numericIds.length === 0) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Yalnış ID formatı'
      })
    }

    const result = await prisma.employee.updateMany({
      where: {
        id: {
          in: numericIds
        }
      },
      data: updateData
    })

    return { 
      success: true, 
      message: `${result.count} əməkdaş yeniləndi`,
      count: result.count
    }
  } catch (error: any) {
    console.error('Employee Bulk Update Error:', error)
    if (error.statusCode) throw error
    throw createError({
      statusCode: 500,
      statusMessage: 'Əməkdaşlar yenilənərkən xəta baş verdi: ' + (error.message || '')
    })
  }
})
