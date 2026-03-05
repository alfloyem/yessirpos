import prisma from '../../utils/prisma'

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event)
    const { ids } = body

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Geçersiz ID listesi'
      })
    }

    // Toplu silme
    const result = await prisma.employee.deleteMany({
      where: {
        id: {
          in: ids
        }
      }
    })

    return { 
      success: true, 
      message: `${result.count} çalışan silindi`,
      count: result.count
    }
  } catch (error: any) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Çalışanlar silinirken hata oluştu'
    })
  }
})
