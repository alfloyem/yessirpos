import prisma from '../../utils/prisma'

export default defineEventHandler(async (event) => {
  try {
    const id = parseInt(getRouterParam(event, 'id') || '0')
    const body = await readBody(event)
    const { name, values } = body

    if (!id) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Yalnış ID'
      })
    }

    const existing = await (prisma as any).attribute.findUnique({
      where: { id }
    })

    if (!existing) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Atribut tapılmadı'
      })
    }

    const updateData: any = {}
    if (name) updateData.name = name
    if (values !== undefined && Array.isArray(values)) updateData.values = JSON.stringify(values)

    const attribute: any = await (prisma as any).attribute.update({
      where: { id },
      data: updateData
    })

    return {
      ...attribute,
      values: JSON.parse(attribute.values)
    }
  } catch (error: any) {
    if (error.statusCode) throw error
    
    throw createError({
      statusCode: 500,
      statusMessage: 'Atribut yenilənərkən xəta baş verdi'
    })
  }
})
