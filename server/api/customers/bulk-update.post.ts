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

    if (!updates || typeof updates !== 'object') {
      throw createError({
        statusCode: 400,
        statusMessage: 'Yeniləmə məlumatları daxil edilməlidir'
      })
    }

    const updateData: any = {}
    if (updates.firstName) updateData.firstName = updates.firstName
    if (updates.lastName) updateData.lastName = updates.lastName
    if (updates.bonus !== undefined) updateData.bonus = updates.bonus
    if (updates.gender !== undefined) updateData.gender = updates.gender
    if (updates.email !== undefined) updateData.email = updates.email
    if (updates.phone !== undefined) updateData.phone = updates.phone
    if (updates.address !== undefined) updateData.address = updates.address
    if (updates.city !== undefined) updateData.city = updates.city
    if (updates.country !== undefined) updateData.country = updates.country
    if (updates.notes !== undefined) updateData.notes = updates.notes

    const result = await prisma.customer.updateMany({
      where: {
        id: {
          in: ids
        }
      },
      data: updateData
    })

    return { 
      success: true, 
      message: `${result.count} müştəri yeniləndi`,
      count: result.count
    }
  } catch (error: any) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Müştərilər yenilənərkən xəta baş verdi'
    })
  }
})
