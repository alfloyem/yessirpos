import { defineEventHandler, readBody, createError } from 'h3'
import prisma from '../../utils/prisma'

export default defineEventHandler(async (event: any) => {
  const body = await readBody(event)
  const { 
    subtotal, 
    discountTotal, 
    finalTotal, 
    cashbackEarned, 
    paymentDetails, 
    cashierId, 
    cashierName, 
    customerId, 
    customerName, 
    customerBarcode,
    items 
  } = body

  try {
    // Ensure prisma instance is ready with models
    if (!(prisma as any).sale) {
      throw createError({
        statusCode: 500,
        statusMessage: 'Verilənlər bazası bağlantısı hazır deyil (Sale model tapılmadı). Zəhmət olmasa bir neçə saniyə sonra yenidən yoxlayın.'
      })
    }

    // 1. Get next receipt number
    const lastSale = await (prisma as any).sale.findFirst({
      orderBy: { id: 'desc' }
    })
    
    let nextNum = 1
    if (lastSale && lastSale.receiptNo) {
      // Try to parse the numeric part of the last receiptNo
      const lastNum = parseInt(lastSale.receiptNo)
      if (!isNaN(lastNum)) {
        nextNum = lastNum + 1
      }
    }
    const receiptNo = nextNum.toString().padStart(13, '0')

    // 2. Execute everything in a transaction
    const result = await (prisma as any).$transaction(async (tx: any) => {
      // a. Create Sale record
      const sale = await tx.sale.create({
        data: {
          receiptNo,
          subtotal: Number(subtotal) || 0,
          discountTotal: Number(discountTotal) || 0,
          finalTotal: Number(finalTotal) || 0,
          cashbackEarned: Number(cashbackEarned) || 0,
          paymentDetails: typeof paymentDetails === 'object' ? JSON.stringify(paymentDetails) : (paymentDetails || null),
          cashierId: cashierId ? Number(cashierId) : null,
          cashierName,
          customerId: customerId ? Number(customerId) : null,
          customerName,
          customerBarcode,
          items: {
            create: items.map((item: any) => ({
              productId: item.productId ? Number(item.productId) : null,
              productName: item.productName,
              barcode: item.barcode,
              qty: Number(item.qty) || 0,
              price: Number(item.retailPrice) || 0,
              wholesalePrice: Number(item.wholesalePrice) || 0,
              discount: Number(item.itemDiscount) || 0,
              total: (Number(item.qty) || 0) * (Number(item.finalPrice) || 0),
              attribute: item.attribute ? (typeof item.attribute === 'object' ? JSON.stringify(item.attribute) : String(item.attribute)) : null
            }))
          }
        },
        include: {
          items: true
        }
      })

      // b. Update stock for each product/variant
      for (const item of items) {
        if (item.productId) {
          await tx.product.updateMany({
            where: { id: Number(item.productId) },
            data: {
              stock: {
                decrement: Number(item.qty) || 0
              }
            }
          })
        }
      }

      return sale
    })

    return result
  } catch (error: any) {
    console.error('Sale Save Error:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Satış qeyd edilərkən xəta baş verdi: ' + (error.message || 'Bilinməyən xəta')
    })
  }
})
