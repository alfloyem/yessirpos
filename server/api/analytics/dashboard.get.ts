import { defineEventHandler, getQuery } from 'h3'
import prisma from '../../utils/prisma'

export default defineEventHandler(async (event: any) => {
  const query = getQuery(event)
  const startDateStr = query.startDate as string
  const endDateStr = query.endDate as string

  // Always require valid dates or fallback to something huge
  const startDate = startDateStr ? new Date(startDateStr) : new Date(0)
  const endDate = endDateStr ? new Date(endDateStr) : new Date()

  // 1. Fetch Sales (includes normal sales and refund sales)
  const sales = await (prisma as any).sale.findMany({
    where: {
      createdAt: {
        gte: startDate,
        lte: endDate
      }
    },
    select: {
      subtotal: true,
      discountTotal: true,
      finalTotal: true,
      createdAt: true,
      paymentDetails: true
    }
  })

  // 2. Fetch Expenses
  const expenses = await (prisma as any).expense.findMany({
    where: {
      createdAt: {
        gte: startDate,
        lte: endDate
      }
    },
    select: {
      amount: true
    }
  })

  // 3. Fetch Intakes
  const intakes = await (prisma as any).intake.findMany({
    where: {
      createdAt: {
        gte: startDate,
        lte: endDate
      }
    },
    select: {
      totalAmount: true
    }
  })

  // Calculations
  let grossRevenue = 0
  let totalRefunds = 0
  let totalDiscount = 0
  let cogsEstimate = 0 // Needs more complex aggregation if needed

  let totalExpenses = 0
  let totalIntakesValue = 0

  const timeSeriesData: Record<string, number> = {}

  for (const exp of expenses) {
    totalExpenses += exp.amount || 0
  }

  for (const int of intakes) {
    totalIntakesValue += int.totalAmount || 0
  }

  for (const sale of sales) {
    // Determine if it's a refund
    const payment = sale.paymentDetails ? JSON.parse(sale.paymentDetails) : {}
    const isRefund = payment.isRefund || sale.finalTotal < 0

    if (isRefund) {
      totalRefunds += Math.abs(sale.finalTotal || 0)
    } else {
      grossRevenue += sale.finalTotal || 0
      totalDiscount += sale.discountTotal || 0
    }

    // Prepare time series for Peak Sales
    // e.g. group by HOUR "YYYY-MM-DD HH:00"
    const dateObj = new Date(sale.createdAt)
    const y = dateObj.getFullYear()
    const m = String(dateObj.getMonth() + 1).padStart(2, '0')
    const d = String(dateObj.getDate()).padStart(2, '0')
    const h = String(dateObj.getHours()).padStart(2, '0')
    const key = `${y}-${m}-${d} ${h}:00`

    if (!timeSeriesData[key]) timeSeriesData[key] = 0
    timeSeriesData[key] += (sale.finalTotal || 0) // Net transaction added to that hour (positive or negative)
  }

  const netRevenue = grossRevenue - totalRefunds - totalExpenses

  // Convert timeSeries to sorted arrays for Chart.js
  const sortedTimes = Object.keys(timeSeriesData).sort()
  const chartLabels = sortedTimes
  const chartData = sortedTimes.map(t => timeSeriesData[t])

  return {
    dashboard: {
      grossRevenue,
      netRevenue,
      totalDiscount,
      totalIntakesValue,
      totalExpenses,
      totalRefunds
    },
    chart: {
      labels: chartLabels,
      data: chartData
    }
  }
})
