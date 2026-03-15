import { defineEventHandler, getQuery } from 'h3'
import prisma from '../../utils/prisma'

export default defineEventHandler(async (event: any) => {
  const query = getQuery(event)
  const startDateStr = query.startDate as string
  const endDateStr = query.endDate as string

  const startDate = startDateStr ? new Date(startDateStr) : new Date(0)
  const endDate = endDateStr ? new Date(endDateStr) : new Date()

  // Find most active cashiers
  const sales = await (prisma as any).sale.findMany({
    where: {
      createdAt: { gte: startDate, lte: endDate }
    },
    select: {
      cashierName: true,
      customerName: true,
      finalTotal: true,
      discountTotal: true,
      paymentDetails: true
    }
  })

  const cashierStats: Record<string, { name: string, totalRevenue: number, totalDiscount: number }> = {}
  const customerStats: Record<string, { name: string, totalSpent: number }> = {}

  for (const sale of sales) {
    const isRefund = sale.paymentDetails && JSON.parse(sale.paymentDetails).isRefund
    if (isRefund) continue

    // Cashiers
    const cName = sale.cashierName || 'Bilinməyən'
    if (!cashierStats[cName]) {
      cashierStats[cName] = { name: cName, totalRevenue: 0, totalDiscount: 0 }
    }
    cashierStats[cName].totalRevenue += (sale.finalTotal || 0)
    cashierStats[cName].totalDiscount += (sale.discountTotal || 0)

    // Customers
    if (sale.customerName) {
      if (!customerStats[sale.customerName]) {
        customerStats[sale.customerName] = { name: sale.customerName, totalSpent: 0 }
      }
      customerStats[sale.customerName].totalSpent += (sale.finalTotal || 0)
    }
  }

  const cashiers = Object.values(cashierStats).sort((a, b) => b.totalRevenue - a.totalRevenue)
  const topCustomers = Object.values(customerStats).sort((a, b) => b.totalSpent - a.totalSpent).slice(0, 10)

  return {
    cashiers,
    topCustomers
  }
})
