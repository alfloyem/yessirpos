import { defineEventHandler, readBody, createError } from 'h3'
import prisma from '../../utils/prisma'

export default defineEventHandler(async (event: any) => {
  const body = await readBody(event)
  
  if (!body.ids || !Array.isArray(body.ids)) {
    throw createError({
      statusCode: 400,
      statusMessage: 'IDs array mütləqdir'
    })
  }

  const result = await prisma.supplier.deleteMany({
    where: {
      id: {
        in: body.ids.map((id: any) => parseInt(id))
      }
    }
  })

  return { success: true, count: result.count }
})
