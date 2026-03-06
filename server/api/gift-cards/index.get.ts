import { defineEventHandler, createError, readBody, getRouterParam, getQuery, getCookie, getHeader } from 'h3'
import prisma from '../../utils/prisma'

export default defineEventHandler(async (event: any) => {
  try {
    const giftCards = await prisma.giftCard.findMany({
      orderBy: {
        createdAt: 'desc'
      },
      include: {
        customer: true
      }
    })
    
    return giftCards.map((gc: any) => ({
      ...gc,
      customerName: gc.customer ? `${gc.customer.firstName} ${gc.customer.lastName}` : 'Naməlum Müştəri'
    }))
  } catch (error) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Hədiyyə kartları yüklənərkən xəta baş verdi'
    })
  }
})
