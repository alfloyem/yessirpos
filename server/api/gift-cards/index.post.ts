import { defineEventHandler, createError, readBody, getRouterParam, getQuery, getCookie, getHeader } from 'h3'
import prisma from '../../utils/prisma'

export default defineEventHandler(async (event: any) => {
  try {
    const body = await readBody(event)
    const { barcode, value, customer, createdAt } = body

    if (!barcode || value === undefined || !customer) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Mütləq xanaları (Barkod, Dəyər, Müştəri) doldurun'
      })
    }

    const valueFloat = parseFloat(value)

    const existingBarcode = await prisma.giftCard.findUnique({
      where: { barcode }
    })

    if (existingBarcode) {
      throw createError({
        statusCode: 409,
        statusMessage: 'Bu kart nömrəsi artıq mövcuddur'
      })
    }

    const { user } = event.context

    const giftCard = await prisma.giftCard.create({
      data: {
        barcode,
        value: valueFloat,
        customerId: parseInt(customer),
        createdBy: user?.name || user?.username || 'Sistem',
        createdAt: createdAt ? new Date(createdAt) : undefined
      },
      include: {
        customer: true
      }
    })

    return {
      ...giftCard,
      customerName: giftCard.customer ? `${giftCard.customer.firstName} ${giftCard.customer.lastName}` : 'Naməlum Müştəri'
    }
  } catch (error: any) {
    if (error.statusCode) throw error
    throw createError({
      statusCode: 500,
      statusMessage: 'Hədiyyə kartı əlavə edilərkən xəta baş verdi'
    })
  }
})
