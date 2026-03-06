import { defineEventHandler, createError, readBody, getRouterParam, getQuery, getCookie, getHeader } from 'h3'
import prisma from '../../utils/prisma'

export default defineEventHandler(async (event: any) => {
  try {
    const attributes = await (prisma as any).attribute.findMany({
      orderBy: {
        createdAt: 'desc'
      }
    })

    return attributes.map((a: any) => ({
      ...a,
      values: a.values ? JSON.parse(a.values) : []
    }))
  } catch (error) {
    console.error('Attributes GET Error:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Atributlar yüklənərkən xəta baş verdi'
    })
  }
})
