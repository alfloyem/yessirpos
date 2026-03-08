import { defineEventHandler, readBody, createError } from 'h3'
import prisma from '../../utils/prisma'

export default defineEventHandler(async (event: any) => {
  try {
    const body = await readBody(event)
    
    if (!body.ids || !Array.isArray(body.ids)) {
      throw createError({
        statusCode: 400,
        statusMessage: 'IDs array mütləqdir'
      })
    }

    if (!body.updates || typeof body.updates !== 'object') {
      throw createError({
        statusCode: 400,
        statusMessage: 'Updates object mütləqdir'
      })
    }

    // Convert arrays to JSON strings
    const updateData: any = {}
    
    if (body.updates.brandName !== undefined) updateData.brandName = body.updates.brandName
    if (body.updates.companyName !== undefined) {
      updateData.companyName = Array.isArray(body.updates.companyName) ? JSON.stringify(body.updates.companyName) : body.updates.companyName
    }
    if (body.updates.firstName !== undefined) updateData.firstName = body.updates.firstName
    if (body.updates.lastName !== undefined) updateData.lastName = body.updates.lastName
    if (body.updates.email !== undefined) updateData.email = body.updates.email
    if (body.updates.phone !== undefined) updateData.phone = body.updates.phone
    if (body.updates.voen !== undefined) {
      updateData.voen = Array.isArray(body.updates.voen) ? JSON.stringify(body.updates.voen) : body.updates.voen
    }
    if (body.updates.address !== undefined) updateData.address = body.updates.address
    if (body.updates.city !== undefined) {
      updateData.city = Array.isArray(body.updates.city) ? JSON.stringify(body.updates.city) : body.updates.city
    }
    if (body.updates.country !== undefined) updateData.country = body.updates.country
    if (body.updates.notes !== undefined) updateData.notes = body.updates.notes

    const numericIds = body.ids.map((id: any) => parseInt(id)).filter((id: number) => !isNaN(id))

    // Update all suppliers with the given IDs
    const result = await prisma.supplier.updateMany({
      where: {
        id: {
          in: numericIds
        }
      },
      data: updateData
    })

    return { success: true, count: result.count }
  } catch (error: any) {
    console.error('Supplier Bulk Update Error:', error)
    if (error.statusCode) throw error
    throw createError({
      statusCode: 500,
      statusMessage: 'Təchizatçılar yenilənərkən xəta baş verdi: ' + (error.message || '')
    })
  }
})
