import { defineEventHandler, createError } from 'h3'
import prisma from '../../utils/prisma'

export default defineEventHandler(async (event: any) => {
  try {
    const sales = await (prisma as any).sale.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        items: true
      },
      take: 500
    })

    return sales.map((sale: any) => ({
      ...sale,
      paymentDetails: sale.paymentDetails ? JSON.parse(sale.paymentDetails) : null,
      items: sale.items.map((item: any) => ({
        ...item,
        attribute: item.attribute ? (item.attribute.startsWith('[') || item.attribute.startsWith('{') ? JSON.parse(item.attribute) : item.attribute) : null
      }))
    }))
  } catch (error: any) {
    console.error('Sales GET Error:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Satışlar yüklənərkən xəta baş verdi'
    })
  }
})
