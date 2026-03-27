import { defineEventHandler, getQuery } from 'h3'
import prisma from '../../utils/prisma'

export default defineEventHandler(async (event: any) => {
  const query = getQuery(event)
  const productId = query.productId as string
  const startDateStr = query.startDate as string
  const endDateStr = query.endDate as string

  const startDate = startDateStr ? new Date(startDateStr) : new Date(0)
  const endDate = endDateStr ? new Date(endDateStr) : new Date()

  // We want to fetch all IntakeItems and SaleItems (both sales and refunds) for this product
  // Then sort them by date (createdAt) to generate a timeline

  const saleItems = await (prisma as any).saleItem.findMany({
    where: {
      productId: Number(productId),
      sale: {
        createdAt: { gte: startDate, lte: endDate }
      }
    },
    include: {
      sale: {
        select: {
          createdAt: true,
          receiptNo: true,
          paymentDetails: true
        }
      }
    }
  })

  const intakeItems = await (prisma as any).intakeItem.findMany({
    where: {
      productId: Number(productId),
      intake: {
        createdAt: { gte: startDate, lte: endDate }
      }
    },
    include: {
      intake: {
        select: {
          createdAt: true,
          receiptNo: true
        }
      }
    }
  })

  const timeline = []

  let netRevenue = 0 // SaleTotal - IntakeCostTotal

  for (const item of saleItems) {
    const isRefund = item.qty < 0 || (item.sale.paymentDetails && JSON.parse(item.sale.paymentDetails).isRefund)
    const type = isRefund ? 'REFUND' : 'SALE'
    
    // For sale item, total is selling price * qty
    if (type === 'SALE') {
        netRevenue += item.total || 0
    } else {
        netRevenue -= Math.abs(item.total || 0) // Refund decreases net revenue
    }

    timeline.push({
      date: item.sale.createdAt,
      type,
      receiptNo: item.sale.receiptNo,
      qty: item.qty, // Will be negative for refunds
      amount: item.total, // For sales, it's selling total
      details: type === 'SALE' ? 'Satış' : 'Geri Qaytarma',
      attribute: item.attribute || null
    })
  }

  for (const item of intakeItems) {
    // Determine wholesale cost 
    // intakeItem has costPrice and total
    netRevenue -= item.total || 0 // Cost of goods decreases net revenue

    timeline.push({
      date: item.intake.createdAt,
      type: 'INTAKE',
      receiptNo: item.intake.receiptNo,
      qty: item.qty,
      amount: item.total, // the cost total
      details: 'Mədaxil (Anbara giriş)'
    })
  }

  // Sort by date ascending (oldest first)
  timeline.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

  // Also include current stock and attribute breakdown
  const product = await (prisma as any).product.findUnique({
    where: { id: Number(productId) },
    select: { stock: true, productName: true, barcode: true }
  })

  // Get all products with same productName for attribute analysis
  const allVariants = await (prisma as any).product.findMany({
    where: { productName: product.productName },
    select: { id: true, barcode: true, attribute: true }
  })

  // Calculate sales by attribute
  const attributeStats: Record<string, { soldQty: number, totalRevenue: number, refundQty: number }> = {}
  
  for (const variant of allVariants) {
    const variantSales = await (prisma as any).saleItem.findMany({
      where: {
        productId: variant.id,
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

    // Parse attribute - it can be JSON string or plain string
    let attrKey = 'Standart'
    if (variant.attribute) {
      try {
        const parsed = JSON.parse(variant.attribute)
        if (Array.isArray(parsed)) {
          attrKey = parsed.map((a: string) => a.split(':').pop()?.trim()).filter(Boolean).join(', ')
        } else {
          attrKey = variant.attribute
        }
      } catch {
        attrKey = variant.attribute
      }
    }

    if (!attributeStats[attrKey]) {
      attributeStats[attrKey] = { soldQty: 0, totalRevenue: 0, refundQty: 0 }
    }

    for (const item of variantSales) {
      const isRefund = item.qty < 0 || (item.sale.paymentDetails && JSON.parse(item.sale.paymentDetails).isRefund)
      if (isRefund) {
        attributeStats[attrKey].refundQty += Math.abs(item.qty)
      } else {
        attributeStats[attrKey].soldQty += item.qty
        attributeStats[attrKey].totalRevenue += item.total
      }
    }
  }

  return {
    product,
    netRevenue,
    timeline,
    attributeStats: Object.entries(attributeStats).map(([attr, stats]) => ({
      attribute: attr,
      ...stats
    }))
  }
})
