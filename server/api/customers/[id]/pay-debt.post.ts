import { defineEventHandler, readBody, createError } from 'h3'
import prisma from '../../../utils/prisma'

export default defineEventHandler(async (event: any) => {
  const id = Number(event.context.params.id)
  const body = await readBody(event)
  const { amount, paymentMethod, cashierId, cashierName, notes } = body

  if (!id || !amount || amount <= 0) {
    throw createError({ 
      statusCode: 400, 
      statusMessage: 'Məbləğ daxil edilmelidir' 
    })
  }

  try {
    const customer = await (prisma as any).customer.findUnique({
      where: { id }
    })

    if (!customer) {
      throw createError({ 
        statusCode: 404, 
        statusMessage: 'Müştəri tapılmadı' 
      })
    }

    // Generate receipt no: D0000001
    const lastPayment = await (prisma as any).customerDebtPayment.findFirst({
      orderBy: { id: 'desc' }
    })
    
    let nextNum = 1
    if (lastPayment && lastPayment.receiptNo) {
      const match = lastPayment.receiptNo.match(/D(\d+)/)
      if (match) {
        nextNum = parseInt(match[1]) + 1
      }
    }
    const receiptNo = `D${nextNum.toString().padStart(7, '0')}`

    const newDebt = Math.max(0, (Number(customer.debt) || 0) - Number(amount))

    const [payment, updatedCustomer] = await (prisma as any).$transaction([
      (prisma as any).customerDebtPayment.create({
        data: {
          receiptNo,
          customerId: id,
          customerName: `${customer.firstName} ${customer.lastName}`,
          customerBarcode: customer.barcode,
          amount: Number(amount),
          paymentMethod: paymentMethod || 'Nəğd',
          cashierId: cashierId ? Number(cashierId) : null,
          cashierName: cashierName || null,
          notes: notes || null
        }
      }),
      (prisma as any).customer.update({
        where: { id },
        data: { debt: newDebt }
      })
    ])

    return {
      success: true,
      payment,
      customer: updatedCustomer
    }
  } catch (error: any) {
    console.error('Pay Debt Error:', error)
    // Debug log to see available properties
    console.log('Available Prisma properties:', Object.keys(prisma))
    throw createError({
      statusCode: 500,
      statusMessage: 'Borc ödənilərkən xəta baş verdi: ' + (error.message || 'Bilinməyən xəta')
    })
  }
})
