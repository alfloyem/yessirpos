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
      take: 10
    })

    return products
  } catch (error: any) {
    return []
  }
})
