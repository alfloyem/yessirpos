import { defineEventHandler, readBody, createError } from 'h3'
import prisma from '../../utils/prisma'

export default defineEventHandler(async (event: any) => {
  const body = await readBody(event)
  
  // Validate required fields
  if (!body.brandName) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Brendin adı mütləqdir'
    })
  }
  
  if (!body.companyName || (Array.isArray(body.companyName) && body.companyName.length === 0)) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Şirkətin adı mütləqdir'
    })
  }

  // Convert arrays to JSON strings
  const companyName = Array.isArray(body.companyName) ? JSON.stringify(body.companyName) : body.companyName
  const voen = Array.isArray(body.voen) ? JSON.stringify(body.voen) : body.voen
  const city = Array.isArray(body.city) ? JSON.stringify(body.city) : body.city

  const supplier = await prisma.supplier.create({
    data: {
      brandName: body.brandName,
      companyName,
      firstName: body.firstName || null,
      lastName: body.lastName || null,
      email: body.email || null,
      phone: body.phone || null,
      voen,
      address: body.address || null,
      city,
      country: body.country || 'AZ',
      notes: body.notes || null,
      createdBy: body.createdBy || 'Admin'
    }
  })

  return supplier
})
