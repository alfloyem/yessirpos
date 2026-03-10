import { defineEventHandler, createError, readBody, getRouterParam, getQuery, getCookie, getHeader } from 'h3'
import prisma from '../../utils/prisma'

export default defineEventHandler(async (event: any) => {
  try {
    const body = await readBody(event)
    const { firstName, lastName, barcode, bonus, gender, email, phone, address, city, country, notes, createdAt } = body

    // Validation
    if (!firstName || !lastName || !barcode) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Mütləq xanaları (Ad, Soyad, Barkod) doldurun'
      })
    }

    // Checking if barcode already exists
    const existingBarcode = await prisma.customer.findUnique({
      where: { barcode }
    })
    if (existingBarcode) {
      throw createError({
        statusCode: 409,
        statusMessage: 'Bu barkod artıq istifadə olunur'
      })
    }

    const { user } = event.context

    const customer: any = await prisma.customer.create({
      data: {
        firstName,
        lastName,
        barcode,
        bonus: Number(bonus) || 0,
        gender,
        email,
        phone,
        address,
        city: Array.isArray(city) ? JSON.stringify(city) : (city || ''),
        country,
        notes,
        createdBy: user?.name || user?.username || 'Sistem',
        createdAt: createdAt ? new Date(createdAt) : undefined
      }
    })

    return {
      ...customer,
      city: customer.city ? (customer.city.startsWith('[') ? JSON.parse(customer.city) : [customer.city]) : []
    }
  } catch (error: any) {
    if (error.statusCode) throw error
    
    console.error('Customer POST Error:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Müştəri əlavə edilərkən xəta baş verdi'
    })
  }
})
