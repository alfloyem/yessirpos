import { defineEventHandler, getQuery } from 'h3'
import prisma from '../../utils/prisma'

export default defineEventHandler(async (event: any) => {
  const query = getQuery(event)
  const startDateStr = query.startDate as string
  const endDateStr = query.endDate as string

  const startDate = startDateStr ? new Date(startDateStr) : new Date(0)
  const endDate = endDateStr ? new Date(endDateStr) : new Date()

  // Find most sold and most refunded products grouped by productId
  const saleItems = await (prisma as any).saleItem.findMany({
    where: {
      sale: {
        createdAt: { gte: startDate, lte: endDate }
      }
    },
    include: {
      sale: {
        select: {
          paymentDetails: true
        }
      }
    }
  })

  const productStats: Record<number, { id: number, name: string, soldQty: number, refundQty: number, totalRevenue: number }> = {}

  for (const item of saleItems) {
    if (!item.productId) continue
    
    if (!productStats[item.productId]) {
      productStats[item.productId] = {
        id: item.productId,
        name: item.productName || 'Unknown',
        soldQty: 0,
        refundQty: 0,
        totalRevenue: 0
      }
    }

    const isRefund = item.qty < 0 || (item.sale.paymentDetails && JSON.parse(item.sale.paymentDetails).isRefund)

    if (isRefund) {
      productStats[item.productId].refundQty += Math.abs(item.qty)
    } else {
      productStats[item.productId].soldQty += item.qty
      productStats[item.productId].totalRevenue += item.total
    }
  }

  const allProducts = Object.values(productStats)
  
  const topSellers = [...allProducts].sort((a, b) => b.soldQty - a.soldQty)
  const mostRefunded = [...allProducts].sort((a, b) => b.refundQty - a.refundQty).filter(p => p.refundQty > 0)

  return {
    topSellers,
    mostRefunded
  }
})
