import { defineEventHandler, createError, getQuery } from 'h3'
import prisma from '../../../utils/prisma'

export default defineEventHandler(async (event: any) => {
  const id = Number(event.context.params.id)

  if (!id) {
    throw createError({ 
      statusCode: 400, 
      statusMessage: 'Müştəri ID-si yoxdur' 
    })
  }

  const query = getQuery(event)
  const page = Number(query.page) || 1
  const limit = Number(query.limit) || 10
  const skip = (page - 1) * limit

  try {
    const history = await (prisma as any).customerDebtPayment.findMany({
      where: { customerId: id },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: skip
    })

    return history
  } catch (error: any) {
    console.error('History Error:', error)
    console.log('Available Prisma properties in history:', Object.keys(prisma))
    throw createError({
      statusCode: 500,
      statusMessage: 'Tarixçə yüklənərkən xəta baş verdi'
    })
  }
})
