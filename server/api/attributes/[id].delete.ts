import prisma from '../../utils/prisma'

export default defineEventHandler(async (event) => {
  try {
    const id = parseInt(getRouterParam(event, 'id') || '0')
    if (!id) throw createError({ statusCode: 400, statusMessage: 'Yalnış ID' })

    await (prisma as any).attribute.delete({
      where: { id }
    })

    return { 
      success: true, 
      message: 'Atribut silindi' 
    }
  } catch (error: any) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Atribut silinərkən xəta baş verdi'
    })
  }
})
