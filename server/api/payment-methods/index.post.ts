import { defineEventHandler, createError, readBody } from 'h3'
import prisma from '../../utils/prisma'

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event)
    const { name, icon, color } = body

    if (!name) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Ad mütləqdir'
      })
    }

    return await prisma.paymentMethod.create({
      data: {
        name,
        icon: icon || 'lucide:credit-card',
        color: color || 'blue'
      }
    })
  } catch (error: any) {
    if (error.code === 'P2002') {
      throw createError({
        statusCode: 409,
        statusMessage: 'Bu adda ödəniş üsulu artıq mövcuddur'
      })
    }
    throw createError({
      statusCode: 500,
      statusMessage: 'Ödəniş üsulu əlavə edilərkən xəta baş verdi'
    })
  }
})
