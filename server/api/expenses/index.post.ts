import { defineEventHandler, createError, readBody } from 'h3'
import prisma from '../../utils/prisma'

export default defineEventHandler(async (event: any) => {
  const body = await readBody(event)
  const user = event.context.user // Auth middleware'den geliyor
  
  if (!body.amount) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Məbləğ boş ola bilməz'
    })
  }

  try {
    const expense = await prisma.expense.create({
      data: {
        date: body.date ? new Date(body.date) : new Date(),
        employeeName: body.employeeName || null,
        amount: parseFloat(body.amount) || 0,
        category: body.category || null,
        paymentMethod: body.paymentMethod || null,
        notes: body.notes || null,
        createdBy: user?.username || 'Sistem'
      }
    })

    return expense
  } catch (error) {
    console.error('Create expense error:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Xərc əlavə edilərkən xəta baş verdi'
    })
  }
})
