import { defineEventHandler, getQuery } from 'h3'
import prisma from '../../utils/prisma'

export default defineEventHandler(async (event: any) => {
  const query = getQuery(event)
  const startDateStr = query.startDate as string
  const endDateStr = query.endDate as string

  const startDate = startDateStr ? new Date(startDateStr) : new Date(0)
  const endDate = endDateStr ? new Date(endDateStr) : new Date()

  const expenses = await (prisma as any).expense.findMany({
    where: {
      createdAt: {
        gte: startDate,
        lte: endDate
      }
    },
    orderBy: {
      createdAt: 'desc'
    }
  })

  // Group by Category
  const categoryStats: Record<string, number> = {}

  for (const exp of expenses) {
    const category = exp.category || 'Təyinsiz'
    categoryStats[category] = (categoryStats[category] || 0) + (exp.amount || 0)
  }

  const categoryChart = {
    labels: Object.keys(categoryStats),
    data: Object.values(categoryStats)
  }

  return {
    expenses,
    categoryChart
  }
})
