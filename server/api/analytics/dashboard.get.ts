import { defineEventHandler, getQuery } from 'h3'
import prisma from '../../utils/prisma'

export default defineEventHandler(async (event: any) => {
  const query = getQuery(event)
  const startDateStr = query.startDate as string
  const endDateStr = query.endDate as string

  const startDate = startDateStr ? new Date(startDateStr) : new Date(0)
  const endDate = endDateStr ? new Date(endDateStr) : new Date()

  // 1. Fetch Sales (includes normal sales and refund sales)
  const sales = await (prisma as any).sale.findMany({
    where: {
      createdAt: { gte: startDate, lte: endDate }
    },
    include: { items: true }
  })

  // 2. Fetch Expenses
  const expenses = await (prisma as any).expense.findMany({
    where: {
      createdAt: { gte: startDate, lte: endDate }
    }
  })

  // 3. Fetch Intakes
  const intakes = await (prisma as any).intake.findMany({
    where: {
      createdAt: { gte: startDate, lte: endDate }
    }
  })

  // 4. Products count + total stock
  const totalProducts = await (prisma as any).product.count()
  const lowStockProducts = await (prisma as any).product.count({
    where: {
      stock: { lte: 5 }
    }
  })
  const stockAggregate = await (prisma as any).product.aggregate({
    _sum: { stock: true }
  })
  const totalStock = stockAggregate._sum.stock ?? 0

  // 5. Customers count
  const totalCustomers = await (prisma as any).customer.count()

  // Calculations
  let grossRevenue = 0
  let totalRefunds = 0
  let totalDiscount = 0
  let totalExpenses = 0
  let totalIntakesValue = 0
  let totalItemsSold = 0
  let totalItemsRefunded = 0
  let totalTransactions = 0
  let refundTransactions = 0
  let grossProfit = 0 // revenue - COGS (wholesale)

  const timeSeriesData: Record<string, { revenue: number, refunds: number, expenses: number }> = {}
  const dailyData: Record<string, { revenue: number, refunds: number, expenses: number, profit: number, orders: number }> = {}


  for (const exp of expenses) {
    totalExpenses += exp.amount || 0
    const dateKey = new Date(exp.createdAt).toISOString().split('T')[0] as string
    if (!dailyData[dateKey!]) dailyData[dateKey!] = { revenue: 0, refunds: 0, expenses: 0, profit: 0, orders: 0 }
    dailyData[dateKey!]!.expenses += exp.amount || 0
  }


  for (const int of intakes) {
    totalIntakesValue += int.totalAmount || 0
  }

  for (const sale of sales) {
    const payment = sale.paymentDetails ? JSON.parse(sale.paymentDetails) : {}
    const isRefund = payment.isRefund || sale.finalTotal < 0
    const dateObj = new Date(sale.createdAt)
    const dateKey = dateObj.toISOString().split('T')[0]
    const h = String(dateObj.getHours()).padStart(2, '0')
    const hourKey = `${h}:00`

    if (!timeSeriesData[hourKey!]) timeSeriesData[hourKey!] = { revenue: 0, refunds: 0, expenses: 0 }
    if (!dailyData[dateKey!]) dailyData[dateKey!] = { revenue: 0, refunds: 0, expenses: 0, profit: 0, orders: 0 }


    totalTransactions++

    if (isRefund) {
      totalRefunds += Math.abs(sale.finalTotal || 0)
      refundTransactions++
      timeSeriesData[hourKey!]!.refunds += Math.abs(sale.finalTotal || 0)
      dailyData[dateKey!]!.refunds += Math.abs(sale.finalTotal || 0)
      for (const item of sale.items) {
        totalItemsRefunded += Math.abs(item.qty || 0)
      }
    } else {
      grossRevenue += sale.finalTotal || 0
      totalDiscount += sale.discountTotal || 0
      timeSeriesData[hourKey!]!.revenue += sale.finalTotal || 0
      dailyData[dateKey!]!.revenue += sale.finalTotal || 0
      dailyData[dateKey!]!.orders += 1


      for (const item of sale.items) {
        totalItemsSold += item.qty || 0
        const wholesale = item.wholesalePrice || 0
        const lineProfit = item.total - (wholesale * item.qty)
        grossProfit += lineProfit
      }
    }
  }

  // Calculate daily profits
  for (const key of Object.keys(dailyData)) {
    const d = dailyData[key]!
    d.profit = d.revenue - d.refunds - d.expenses
  }

  const netRevenue = grossRevenue - totalRefunds - totalExpenses

  // Hourly chart sorted
  const allHours = Array.from({ length: 24 }, (_, i) => `${String(i).padStart(2, '0')}:00`)
  const hourlyChart = {
    labels: allHours,
    revenue: allHours.map(h => timeSeriesData[h]?.revenue || 0),
    refunds: allHours.map(h => timeSeriesData[h]?.refunds || 0)
  }

  // Daily chart sorted
  const sortedDays = Object.keys(dailyData).sort()
  const dailyChart = {
    labels: sortedDays.map(d => {
      const date = new Date(d)
      return `${date.getDate()}/${date.getMonth() + 1}`
    }),
    revenue: sortedDays.map(d => dailyData[d]!.revenue),
    expenses: sortedDays.map(d => dailyData[d]!.expenses + dailyData[d]!.refunds),
    profit: sortedDays.map(d => dailyData[d]!.profit),
    orders: sortedDays.map(d => dailyData[d]!.orders)
  }


  // Average order value
  const validSales = totalTransactions - refundTransactions
  const avgOrderValue = validSales > 0 ? grossRevenue / validSales : 0

  // 6. Top Products calculation
  const productStats: Record<number, { id: number, name: string, soldQty: number, totalRevenue: number }> = {}
  for (const sale of sales) {
    const payment = sale.paymentDetails ? JSON.parse(sale.paymentDetails) : {}
    if (payment.isRefund || sale.finalTotal < 0) continue

    for (const item of sale.items) {
      const productId = item.productId
      if (!productId) continue
      
      if (!productStats[productId]) {
        productStats[productId] = {
          id: productId,
          name: item.productName || 'Unknown',
          soldQty: 0,
          totalRevenue: 0
        }
      }
      const pStat = productStats[productId]!
      pStat.soldQty += item.qty
      pStat.totalRevenue += item.total
    }
  }

  const topProducts = Object.values(productStats)
    .sort((a: any, b: any) => b.totalRevenue - a.totalRevenue)
    .slice(0, 5)

  // 7. Recent Orders
  const recentOrders = sales
    .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5)
    .map((sale: any) => ({
      id: sale.receiptNo,
      customer: sale.customerName || 'Anonim',
      amount: sale.finalTotal,
      status: (sale.paymentDetails && JSON.parse(sale.paymentDetails).isRefund) ? 'cancelled' : 'completed',
      date: sale.createdAt
    }))


  return {
    kpis: {
      grossRevenue,
      netRevenue,
      grossProfit,
      totalDiscount,
      totalIntakesValue,
      totalExpenses,
      totalRefunds,
      totalTransactions,
      refundTransactions,
      totalItemsSold,
      totalItemsRefunded,
      avgOrderValue,
      totalProducts,
      totalStock,
      lowStockProducts,
      totalCustomers,
      refundRate: totalTransactions > 0 ? ((refundTransactions / totalTransactions) * 100) : 0
    },
    hourlyChart,
    dailyChart,
    topProducts,
    recentOrders
  }
})
