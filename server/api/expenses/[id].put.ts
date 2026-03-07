import { defineEventHandler, createError, readBody, getRouterParam } from 'h3'
import prisma from '../../utils/prisma'

export default defineEventHandler(async (event: any) => {
  const idStr = getRouterParam(event, 'id')
  const id = parseInt(idStr || '')
  if (isNaN(id)) {
    throw createError({ statusCode: 400, statusMessage: 'Yanlış xərc ID' })
  }

  const body = await readBody(event)

  try {
    const updated = await prisma.expense.update({
      where: { id },
      data: {
        date: body.date ? new Date(body.date) : undefined,
        employeeName: body.employeeName !== undefined ? body.employeeName : undefined,
        amount: body.amount !== undefined ? parseFloat(body.amount) : undefined,
        category: body.category !== undefined ? body.category : undefined,
        paymentMethod: body.paymentMethod !== undefined ? body.paymentMethod : undefined,
        notes: body.notes !== undefined ? body.notes : undefined
      }
    })

    return updated
  } catch (error) {
    console.error('Update expense error:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Xərc yenilənərkən xəta baş verdi'
    })
  }
})
