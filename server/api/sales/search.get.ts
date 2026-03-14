import { defineEventHandler, getQuery, createError } from 'h3'
import prisma from '../../utils/prisma'

export default defineEventHandler(async (event: any) => {
  const query = getQuery(event)
  const { receiptNo } = query

  if (!receiptNo) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Çek nömrəsi daxil edilməlidir'
    })
  }

  try {
    const sale = await (prisma as any).sale.findUnique({
      where: { receiptNo: String(receiptNo) },
      include: {
        items: true
      }
    })

    if (!sale) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Çek tapılmadı'
      })
    }

    return {
      ...sale,
      paymentDetails: sale.paymentDetails ? JSON.parse(sale.paymentDetails) : null,
      items: sale.items.map((item: any) => ({
        ...item,
        attribute: item.attribute ? (item.attribute.startsWith('[') || item.attribute.startsWith('{') ? JSON.parse(item.attribute) : item.attribute) : null
      }))
    }
  } catch (error: any) {
    console.error('Sale Search Error:', error)
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || 'Axtarış zamanı xəta baş verdi'
    })
  }
})
