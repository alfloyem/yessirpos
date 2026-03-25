import { defineEventHandler, createError } from 'h3'
import prisma from '../../utils/prisma'

export default defineEventHandler(async (event: any) => {
  try {
    // Test database connection first
    await (prisma as any).$connect()
    
    const [sales, intakes, debtPayments] = await Promise.all([
      (prisma as any).sale.findMany({
        orderBy: { createdAt: 'desc' },
        include: { items: true }
      }).catch((err: any) => {
        console.error('Sales query error:', err)
        return []
      }),
      (prisma as any).intake.findMany({
        orderBy: { createdAt: 'desc' },
        include: { items: true }
      }).catch((err: any) => {
        console.error('Intakes query error:', err)
        return []
      }),
      (prisma as any).intakePayment.findMany({
        orderBy: { createdAt: 'desc' },
        include: { intake: { include: { items: true } } }
      }).catch((err: any) => {
        console.error('Debt payments query error:', err)
        return []
      })
    ])

    console.log('Receipts loaded:', { 
      salesCount: sales.length, 
      intakesCount: intakes.length, 
      debtPaymentsCount: debtPayments.length 
    })

    // Map sales & refunds
    const mappedSales = sales.map((s: any) => {
      const isRefund = s.finalTotal < 0
      return {
        id: `sale-${s.id}`,
        dbId: s.id,
        receiptNo: s.receiptNo,
        createdAt: s.createdAt,
        type: isRefund ? 'REFUND' : 'SALE',
        counterparty: s.customerName || 'Anonim Müştəri',
        operator: s.cashierName || 'Sistem',
        total: s.finalTotal,
        subtotal: s.subtotal,
        discountTotal: s.discountTotal,
        paymentDetails: s.paymentDetails ? JSON.parse(s.paymentDetails) : null,
        items: s.items.map((i: any) => ({
          ...i,
          price: i.price,
          wholesalePrice: i.wholesalePrice || 0,
          attribute: i.attribute ? (i.attribute.startsWith('[') || i.attribute.startsWith('{') ? JSON.parse(i.attribute) : i.attribute) : null
        }))
      }
    })

    // Map intakes (Received)
    const mappedIntakes = intakes.map((i: any) => ({
      id: `intake-${i.id}`,
      dbId: i.id,
      receiptNo: i.receiptNo,
      createdAt: i.createdAt,
      type: 'INTAKE',
      counterparty: i.supplierName || 'Məlum deyil',
      operator: i.createdBy || 'Sistem',
      total: i.totalAmount,
      subtotal: i.totalAmount,
      discountTotal: 0,
      paymentDetails: {
        method: i.paymentMethod,
        paidAmount: i.paidAmount,
        balanceDue: i.balanceDue,
        notes: i.notes
      },
      items: i.items.map((it: any) => ({
        id: it.id,
        productId: it.productId,
        productName: it.productName,
        barcode: it.barcode,
        qty: it.qty,
        price: it.costPrice,
        wholesalePrice: it.costPrice,
        discount: it.discount,
        total: it.total,
        attribute: it.attribute ? (it.attribute.startsWith('[') || it.attribute.startsWith('{') ? JSON.parse(it.attribute) : it.attribute) : null
      }))
    }))

    // Map debt payments
    const mappedDebtPayments = debtPayments.map((dp: any) => ({
      id: `debtpay-${dp.id}`,
      dbId: dp.id,
      receiptNo: dp.receiptNo,
      createdAt: dp.createdAt,
      type: 'DEBT_PAYMENT',
      counterparty: dp.intake?.supplierName || 'Məlum deyil',
      operator: dp.paidBy || 'Sistem',
      total: dp.amount,
      subtotal: dp.amount,
      discountTotal: 0,
      paymentDetails: {
        method: dp.paymentMethod,
        paidAmount: dp.amount,
        balanceDue: 0,
        notes: dp.notes,
        relatedIntakeNo: dp.intake?.receiptNo,
      },
      items: dp.intake?.items?.map((it: any) => ({
        id: it.id,
        productId: it.productId,
        productName: it.productName,
        barcode: it.barcode,
        qty: it.qty,
        price: it.costPrice,
        wholesalePrice: it.costPrice,
        discount: it.discount,
        total: it.total,
        attribute: it.attribute ? (it.attribute.startsWith('[') || it.attribute.startsWith('{') ? JSON.parse(it.attribute) : it.attribute) : null
      })) || []
    }))

    const result = [...mappedSales, ...mappedIntakes, ...mappedDebtPayments].sort((a: any, b: any) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )
    
    console.log('Returning', result.length, 'receipts')
    return result
  } catch (error: any) {
    console.error('Receipts GET Error:', error)
    console.error('Error stack:', error.stack)
    console.error('Error message:', error.message)
    throw createError({
      statusCode: 500,
      statusMessage: 'Fişlər yüklənərkən xəta baş verdi',
      data: { error: error.message, stack: error.stack }
    })
  }
})
