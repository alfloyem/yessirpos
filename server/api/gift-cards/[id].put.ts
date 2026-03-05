import prisma from '../../utils/prisma'

export default defineEventHandler(async (event) => {
  try {
    const id = parseInt(getRouterParam(event, 'id') || '0')
    const body = await readBody(event)
    const { barcode, value, customer } = body

    if (!id) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Yalnış ID'
      })
    }

    const existingCard = await prisma.giftCard.findUnique({ where: { id } })
    if (!existingCard) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Kart tapılmadı'
      })
    }

    if (barcode && barcode !== existingCard.barcode) {
      const barcodeExists = await prisma.giftCard.findUnique({ where: { barcode } })
      if (barcodeExists) {
        throw createError({
          statusCode: 409,
          statusMessage: 'Bu kart nömrəsi artıq mövcuddur'
        })
      }
    }

    const updateData: any = {}
    if (barcode) updateData.barcode = barcode
    if (value !== undefined) updateData.value = parseFloat(value)
    if (customer) updateData.customerId = parseInt(customer)

    const giftCard = await prisma.giftCard.update({
      where: { id },
      data: updateData,
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
      statusMessage: 'Hədiyyə kartı yenilənərkən xəta baş verdi'
    })
  }
})
