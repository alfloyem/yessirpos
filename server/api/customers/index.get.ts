import prisma from '../../utils/prisma'

export default defineEventHandler(async (event) => {
  try {
    const customers = await prisma.customer.findMany({
      orderBy: {
        createdAt: 'desc'
      }
    })
    return customers
  } catch (error) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Müştərilər yüklənərkən xəta baş verdi'
    })
  }
})
