import { defineEventHandler, readBody, createError, getRouterParam } from 'h3'
import prisma from '../../utils/prisma'

export default defineEventHandler(async (event: any) => {
  const id = getRouterParam(event, 'id')
  const body = await readBody(event)
  
  if (!id) {
    throw createError({
      statusCode: 400,
      statusMessage: 'ID mütləqdir'
    })
  }

  // Convert arrays to JSON strings
  const updateData: any = {}
  
  if (body.brandName !== undefined) updateData.brandName = body.brandName
  if (body.companyName !== undefined) {
    updateData.companyName = Array.isArray(body.companyName) ? JSON.stringify(body.companyName) : body.companyName
  }
  if (body.firstName !== undefined) updateData.firstName = body.firstName
  if (body.lastName !== undefined) updateData.lastName = body.lastName
  if (body.email !== undefined) updateData.email = body.email
  if (body.phone !== undefined) updateData.phone = body.phone
  if (body.voen !== undefined) {
    updateData.voen = Array.isArray(body.voen) ? JSON.stringify(body.voen) : body.voen
  }
  if (body.address !== undefined) updateData.address = body.address
  if (body.city !== undefined) {
    updateData.city = Array.isArray(body.city) ? JSON.stringify(body.city) : body.city
  }
  if (body.country !== undefined) updateData.country = body.country
  if (body.notes !== undefined) updateData.notes = body.notes

  const supplier = await prisma.supplier.update({
    where: { id: parseInt(id) },
    data: updateData
  })

  return supplier
})
