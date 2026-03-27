import { defineEventHandler, createError } from 'h3'
import prisma from '../../../utils/prisma'

export default defineEventHandler(async (event: any) => {
  const id = Number(event.context.params.id)

  if (!id) {
    throw createError({ 
      statusCode: 400, 
      statusMessage: 'Müştəri ID-si yoxdur' 
    })
  }

  try {
    const history = await (prisma as any).customerDebtPayment.findMany({
      where: { customerId: id },
      orderBy: { createdAt: 'desc' }
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
