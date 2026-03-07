import { defineEventHandler } from 'h3'
import prisma from '../../utils/prisma'

export default defineEventHandler(async (event: any) => {
  try {
    const suppliers = await prisma.supplier.findMany({
      orderBy: {
        createdAt: 'desc'
      }
    })

    return suppliers
  } catch (error: any) {
    console.error('Suppliers GET error:', error)
    return []
  }
})
