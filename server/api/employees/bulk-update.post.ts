import prisma from '../../utils/prisma'

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event)
    const { ids, updates } = body

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Geçersiz ID listesi'
      })
    }

    if (!updates || typeof updates !== 'object') {
      throw createError({
        statusCode: 400,
        statusMessage: 'Güncelleme verileri gerekli'
      })
    }

    // Güncelleme verilerini hazırla (boş alanları çıkar)
    const updateData: any = {}
    if (updates.firstName) updateData.firstName = updates.firstName
    if (updates.lastName) updateData.lastName = updates.lastName
    if (updates.email !== undefined) updateData.email = updates.email
    if (updates.phone !== undefined) updateData.phone = updates.phone
    if (updates.gender !== undefined) updateData.gender = updates.gender
    if (updates.status !== undefined) updateData.status = updates.status
    if (updates.notes !== undefined) updateData.notes = updates.notes

    // Toplu güncelleme
    const result = await prisma.employee.updateMany({
      where: {
        id: {
          in: ids
        }
      },
      data: updateData
    })

    return { 
      success: true, 
      message: `${result.count} çalışan güncellendi`,
      count: result.count
    }
  } catch (error: any) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Çalışanlar güncellenirken hata oluştu'
    })
  }
})
