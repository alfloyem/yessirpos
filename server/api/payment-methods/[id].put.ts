import { defineEventHandler, createError, readBody, getRouterParam } from 'h3'
import prisma from '../../utils/prisma'

export default defineEventHandler(async (event) => {
  try {
    const id = parseInt(getRouterParam(event, 'id') || '0')
    const body = await readBody(event)
    const { name, icon, color } = body

    if (!id) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Yalnış ID'
      })
    }

    return await prisma.paymentMethod.update({
      where: { id },
      data: {
        name,
        icon,
        color
      }
    })
  } catch (error: any) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Ödəniş üsulu yenilənərkən xəta baş verdi'
    })
  }
})
