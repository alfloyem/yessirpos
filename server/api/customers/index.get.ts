import prisma from '../../utils/prisma'

export default defineEventHandler(async (event) => {
  try {
    const customers = await prisma.customer.findMany({
      orderBy: {
        createdAt: 'desc'
      }
    })
    return customers.map((c: any) => {
      let parsedCity = []
      if (c.city) {
        try { parsedCity = JSON.parse(c.city) } catch (e) { parsedCity = [c.city] }
      }
      return { ...c, city: parsedCity }
    })
  } catch (error) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Müştərilər yüklənərkən xəta baş verdi'
    })
  }
})
