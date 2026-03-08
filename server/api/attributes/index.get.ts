import { defineEventHandler, createError, readBody, getRouterParam, getQuery, getCookie, getHeader } from 'h3'
import prisma from '../../utils/prisma'

export default defineEventHandler(async (event: any) => {
  try {
    const attributes = await (prisma as any).attribute.findMany({
      orderBy: {
        createdAt: 'desc'
      }
    })

    return attributes.map((a: any) => {
      let parsedValues = []
      if (a.values) {
        if (Array.isArray(a.values)) {
          parsedValues = a.values
        } else if (typeof a.values === 'string') {
          try {
            parsedValues = a.values.startsWith('[') ? JSON.parse(a.values) : [a.values]
          } catch {
            parsedValues = [a.values]
          }
        }
      }
      return {
        ...a,
        values: Array.isArray(parsedValues) ? parsedValues : [parsedValues]
      }
    })
  } catch (error) {
    console.error('Attributes GET Error:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Atributlar yüklənərkən xəta baş verdi'
    })
  }
})
