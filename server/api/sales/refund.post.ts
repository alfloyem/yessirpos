import { defineEventHandler, readBody, createError } from 'h3'
import prisma from '../../utils/prisma'
import { createNotification } from '../../utils/notifications'

export default defineEventHandler(async (event: any) => {
  const body = await readBody(event)
  const { 
    originalSaleId, 
    refundItems, // Array of { id (SaleItem ID), productId, qty, total (amount to refund for this line) }
    refundTotals, // { subtotal, discountTotal, finalTotal, cashbackToSubtract }
    cashierId,
    cashierName
  } = body

  try {
    // 1. Get original sale to see payment details and customer
    const originalSale = await (prisma as any).sale.findUnique({
      where: { id: Number(originalSaleId) },
      include: { items: true }
    })

    if (!originalSale) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Orijinal satış tapılmadı'
      })
    }

    const originalPaymentDetails = originalSale.paymentDetails ? JSON.parse(originalSale.paymentDetails) : {}

    // 2. Get next receipt number
    const lastSale = await (prisma as any).sale.findFirst({
      orderBy: { id: 'desc' }
    })
    
    let nextNum = 1
    if (lastSale && lastSale.receiptNo) {
      const lastNum = parseInt(lastSale.receiptNo)
      if (!isNaN(lastNum)) {
        nextNum = lastNum + 1
      }
    }
    const receiptNo = nextNum.toString().padStart(13, '0')

    // 3. Execute everything in a transaction
    const result = await (prisma as any).$transaction(async (tx: any) => {
      // a. Create Refund Sale record (with negative values)
      const refundSale = await tx.sale.create({
        data: {
          receiptNo,
          subtotal: -(Number(refundTotals.subtotal) || 0),
          discountTotal: -(Number(refundTotals.discountTotal) || 0),
          finalTotal: -(Number(refundTotals.finalTotal) || 0),
          cashbackEarned: -(Number(refundTotals.cashbackToSubtract) || 0),
          paymentDetails: JSON.stringify({
            ...originalPaymentDetails,
            isRefund: true,
            originalReceiptNo: originalSale.receiptNo,
            refundMethod: originalPaymentDetails.method || 'Refund'
          }),
          cashierId: cashierId ? Number(cashierId) : originalSale.cashierId,
          cashierName: cashierName || originalSale.cashierName,
          customerId: originalSale.customerId,
          customerName: originalSale.customerName,
          customerBarcode: originalSale.customerBarcode,
          items: {
            create: refundItems.map((item: any) => {
              const originalItem = originalSale.items.find((oi: any) => oi.id === item.id)
              const qtyToRefund = Number(item.qty) || 0
              const unitPrice = Number(originalItem?.price) || 0
              const unitWholesale = Number(originalItem?.wholesalePrice) || 0
              const unitDiscountToRefund = (Number(originalItem?.discount) || 0) / (Number(originalItem?.qty) || 1)
              const lineTotalToRefund = (Number(originalItem?.total) || 0) * (qtyToRefund / (Number(originalItem?.qty) || 1))

              return {
                productId: item.productId ? Number(item.productId) : null,
                productName: originalItem?.productName || 'Refunded Item',
                barcode: originalItem?.barcode,
                qty: -qtyToRefund,
                price: unitPrice,
                wholesalePrice: unitWholesale,
                discount: -(unitDiscountToRefund * qtyToRefund),
                total: -lineTotalToRefund,
                attribute: originalItem?.attribute ? (typeof originalItem.attribute === 'object' ? JSON.stringify(originalItem.attribute) : String(originalItem.attribute)) : null
              }
            })
          }
        },
        include: {
          items: true
        }
      })

      // b. Update stock (Increment)
      for (const item of refundItems) {
        if (item.productId) {
          await tx.product.update({
            where: { id: Number(item.productId) },
            data: {
              stock: {
                increment: Number(item.qty) || 0
              }
            }
          })
        }
      }

      // c. Revert Customer Bonus
      if (originalSale.customerId) {
        const customer = await tx.customer.findUnique({ where: { id: originalSale.customerId } })
        if (customer) {
          let bonusUpdate = Number(customer.bonus) || 0
          bonusUpdate -= (Number(refundTotals.cashbackToSubtract) || 0)

          const payments = originalPaymentDetails.payments || {}
          if (payments['Bonus'] > 0) {
            const totalPaid = Number(originalSale.finalTotal) || 1
            const bonusRatio = Number(payments['Bonus']) / totalPaid
            const bonusToReturn = (Number(refundTotals.finalTotal) || 0) * bonusRatio
            bonusUpdate += bonusToReturn
          }

          await tx.customer.update({
            where: { id: customer.id },
            data: { bonus: Number(bonusUpdate.toFixed(2)) }
          })
        }
      }

      // d. Revert Gift Card
      const giftCardInfo = originalPaymentDetails.giftCard || (originalPaymentDetails.giftCardBarcode ? { barcode: originalPaymentDetails.giftCardBarcode } : null)
      if (giftCardInfo?.barcode) {
        const giftCard = await tx.giftCard.findUnique({ where: { barcode: giftCardInfo.barcode } })
        if (giftCard) {
          const payments = originalPaymentDetails.payments || {}
          let gcPaid = Number(payments['Hədiyyə Kartı']) || 0
          if (gcPaid === 0 && originalPaymentDetails.method === 'Hədiyyə Kartı') {
            gcPaid = Number(originalSale.finalTotal) || 0
          }
          
          if (gcPaid > 0) {
            const totalPaid = Number(originalSale.finalTotal) || 1
            const gcRatio = gcPaid / totalPaid
            const gcToReturn = (Number(refundTotals.finalTotal) || 0) * gcRatio
            await tx.giftCard.update({
              where: { id: giftCard.id },
              data: { value: { increment: Number(gcToReturn.toFixed(2)) } }
            })
          }
        }
      }

      return refundSale
    })

    // Add Notification
    await createNotification({
      type: 'REFUND_PROCESSED',
      title: 'Geri Ödəniş (Qaytarma)',
      message: `${originalSale.receiptNo} nömrəli çek üzrə ${Number(refundTotals.finalTotal).toFixed(2)} ₼ geri qaytarıldı.`,
      data: { refundSaleId: result.id, originalReceiptNo: originalSale.receiptNo, amount: refundTotals.finalTotal }
    })

    return result
  } catch (error: any) {
    console.error('Refund Error:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Geri ödəmə qeyd edilərkən xəta baş verdi: ' + (error.message || 'Bilinməyən xəta')
    })
  }
})
