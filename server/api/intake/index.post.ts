import { defineEventHandler, readBody, createError } from 'h3'
import prisma from '../../utils/prisma'

export default defineEventHandler(async (event: any) => {
  const body = await readBody(event)
  const { 
    supplierId,
    supplierName,
    totalAmount,
    paidAmount,
    balanceDue,
    paymentMethod,
    notes,
    items, // Array of { productId, productName, barcode, qty, costPrice, discount, discountType, total, attribute }
    createdBy
  } = body

  try {
    // 1. Generate Receipt Number RXXXXXXX
    const lastIntake = await (prisma as any).intake.findFirst({
      orderBy: { id: 'desc' }
    })

    let nextNum = 1
    if (lastIntake && lastIntake.receiptNo) {
      const match = lastIntake.receiptNo.match(/R(\d+)/)
      if (match) {
        nextNum = parseInt(match[1]) + 1
      }
    }
    const receiptNo = `R${nextNum.toString().padStart(7, '0')}`

    // 2. Transaction
    const result = await (prisma as any).$transaction(async (tx: any) => {
      // a. Create Intake Record
      const intake = await tx.intake.create({
        data: {
          receiptNo,
          supplierId: supplierId ? Number(supplierId) : null,
          supplierName,
          totalAmount: Number(totalAmount) || 0,
          paidAmount: Number(paidAmount) || 0,
          balanceDue: Number(balanceDue) || 0,
          paymentMethod,
          notes,
          createdBy,
          items: {
            create: items.map((item: any) => ({
              productId: Number(item.productId),
              productName: item.productName,
              barcode: item.barcode,
              qty: Number(item.qty) || 0,
              costPrice: Number(item.costPrice) || 0,
              discount: Number(item.discount) || 0,
              discountType: item.discountType || 'amount',
              total: Number(item.total) || 0,
              attribute: item.attribute ? (typeof item.attribute === 'object' ? JSON.stringify(item.attribute) : String(item.attribute)) : null
            }))
          }
        }
      })

      // b. Update Stocks
      for (const item of items) {
        await tx.product.update({
          where: { id: Number(item.productId) },
          data: {
            stock: {
              increment: Number(item.qty) || 0
            }
          }
        })
      }

      return intake
    })

    return result
  } catch (error: any) {
    console.error('Intake Save Error:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Qəbul qeyd edilərkən xəta baş verdi: ' + (error.message || 'Bilinməyən xəta')
    })
  }
})
