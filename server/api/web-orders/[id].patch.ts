import { defineEventHandler, readBody, getRouterParam, createError } from 'h3'
import prisma from '../../utils/prisma'

const VALID_STATUSES = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled']

export default defineEventHandler(async (event) => {
  const id = parseInt(getRouterParam(event, 'id') || '0')
  if (!id) throw createError({ statusCode: 400, statusMessage: 'Yanlış ID' })

  const { status } = await readBody(event)
  if (!status || !VALID_STATUSES.includes(status)) {
    throw createError({ statusCode: 400, statusMessage: 'Yanlış status' })
  }

  const order = await (prisma as any).order.update({
    where: { id },
    data: { status },
    include: { items: true },
  })

  return order
})
