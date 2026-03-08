import { defineEventHandler, createError, readBody, getRouterParam } from 'h3'
import prisma from '../../utils/prisma'

export default defineEventHandler(async (event) => {
  try {
    const id = parseInt(getRouterParam(event, 'id') || '0')
    const body = await readBody(event)
    const { name, icon, color } = body

    const method = await prisma.paymentMethod.findUnique({ where: { id } })
    if (method?.isSystem) {
      throw createError({
        statusCode: 403,
        statusMessage: 'Sistem tərəfindən qorunan ödəniş üsulunu redaktə etmək olmaz'
      })
    }

    return await prisma.paymentMethod.update({
      where: { id },
      data: {
        name,
        icon,
        color,
        isSystem: body.isSystem
      }
    })
  } catch (error: any) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Ödəniş üsulu yenilənərkən xəta baş verdi'
    })
  }
})
