import { defineEventHandler, createError, readBody, getRouterParam, getQuery, getCookie, getHeader } from 'h3'
import prisma from '../../utils/prisma'

export default defineEventHandler(async (event: any) => {
  try {
    const id = parseInt(getRouterParam(event, 'id') || '0')
    const body = await readBody(event)
    const { firstName, lastName, barcode, bonus, gender, email, phone, address, city, country, notes } = body

    if (!id) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Yalnış ID'
      })
    }

    const existingCustomer = await prisma.customer.findUnique({
      where: { id }
    })

    if (!existingCustomer) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Müştəri tapılmadı'
      })
    }

    // Checking if barcode was changed and is unique
    if (barcode && barcode !== existingCustomer.barcode) {
      const barcodeExists = await prisma.customer.findUnique({
        where: { barcode }
      })

      if (barcodeExists) {
        throw createError({
          statusCode: 409,
          statusMessage: 'Bu barkod artıq istifadə olunur'
        })
      }
    }

    const updateData: any = {}
    if (firstName) updateData.firstName = firstName
    if (lastName) updateData.lastName = lastName
    if (barcode) updateData.barcode = barcode
    if (bonus !== undefined) updateData.bonus = Number(bonus)
    if (email !== undefined) updateData.email = email
    if (phone !== undefined) updateData.phone = phone
    if (gender !== undefined) updateData.gender = gender
    if (address !== undefined) updateData.address = address
    if (city !== undefined) updateData.city = Array.isArray(city) ? JSON.stringify(city) : (city || '')
    if (country !== undefined) updateData.country = country
    if (notes !== undefined) updateData.notes = notes

    const customer: any = await prisma.customer.update({
      where: { id },
      data: updateData
    })

    return {
      ...customer,
      city: customer.city ? (customer.city.startsWith('[') ? JSON.parse(customer.city) : [customer.city]) : []
    }
  } catch (error: any) {
    console.error('[id].put.ts error:', error)
    if (error.statusCode) throw error
    
    throw createError({
      statusCode: 500,
      statusMessage: `Müştəri yenilənərkən xəta baş verdi: ${error.message || 'Bilinməyən xəta'}`
    })
  }
})
