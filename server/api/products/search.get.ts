import { defineEventHandler, getQuery } from 'h3'
import prisma from '../../utils/prisma'

export default defineEventHandler(async (event: any) => {
  const query = getQuery(event)
  const q = (query.q as string) || ''

  if (!q || q.length < 2) return []

  try {
    const products = await (prisma as any).product.findMany({
      where: {
        OR: [
          { productName: { contains: q, mode: 'insensitive' } },
          { barcode: { contains: q, mode: 'insensitive' } }
        ]
      },
      orderBy: { id: 'asc' },
      take: 50 // Optimization: prevents loading entire catalog
    })

    // Group by productName and return only first occurrence
    const uniqueProducts = new Map()
    for (const product of products) {
      if (!uniqueProducts.has(product.productName)) {
        uniqueProducts.set(product.productName, product)
      }
    }

    return Array.from(uniqueProducts.values()).slice(0, 10)
  } catch (error: any) {
    return []
  }
})
