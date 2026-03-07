import { defineEventHandler, createError, getRouterParam } from 'h3'
import prisma from '../../utils/prisma'

export default defineEventHandler(async (event: any) => {
  const id = getRouterParam(event, 'id')
  
  if (!id) {
    throw createError({
      statusCode: 400,
      statusMessage: 'ID mütləqdir'
    })
  }

  await prisma.supplier.delete({
    where: { id: parseInt(id) }
  })

  return { success: true }
})
