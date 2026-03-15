import { defineEventHandler, getQuery } from 'h3'
import prisma from '../../utils/prisma'

export default defineEventHandler(async (event: any) => {
  const query = getQuery(event)
  const startDateStr = query.startDate as string
  const endDateStr = query.endDate as string

  const startDate = startDateStr ? new Date(startDateStr) : new Date(0)
  const endDate = endDateStr ? new Date(endDateStr) : new Date()

  // 1. Fetch Sales (includes normal and refunds)
  const sales = await (prisma as any).sale.findMany({
    where: {
      createdAt: {
        gte: startDate,
        lte: endDate
      }
    },
    select: {
      id: true,
      receiptNo: true,
      subtotal: true,
      discountTotal: true,
      finalTotal: true,
      createdAt: true,
      paymentDetails: true,
      cashierName: true,
      customerName: true
    },
    orderBy: {
      createdAt: 'desc'
    }
  })

  // Group by Payment Method (from sales only, not refunds)
  const paymentMethodStats: Record<string, number> = {}

  for (const sale of sales) {
    const payment = sale.paymentDetails ? JSON.parse(sale.paymentDetails) : {}
    const isRefund = payment.isRefund || sale.finalTotal < 0

    if (!isRefund) {
        if (payment.method) {
            paymentMethodStats[payment.method] = (paymentMethodStats[payment.method] || 0) + (sale.finalTotal || 0)
        }
    }
  }

  const paymentMethods = {
    labels: Object.keys(paymentMethodStats),
    data: Object.values(paymentMethodStats)
  }

  return {
    sales, // For the Datatable
    paymentMethods
  }
})
