import prisma from '../../utils/prisma'

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event)
    const { name, values } = body

    console.log('Attribute POST - User from context:', event.context.user)

    if (!name || !values || !Array.isArray(values) || values.length === 0) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Ad və dəyərlər mütləqdir'
      })
    }

    const { user } = event.context

    const attribute: any = await (prisma as any).attribute.create({
      data: {
        name,
        values: JSON.stringify(values),
        createdBy: user?.name || user?.username || 'Admin'
      }
    })

    return {
      ...attribute,
      values: JSON.parse(attribute.values)
    }
  } catch (error: any) {
    if (error.statusCode) throw error
    
    console.error('Attribute POST Error:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Atribut əlavə edilərkən xəta baş verdi'
    })
  }
})
