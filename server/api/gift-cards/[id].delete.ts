import prisma from '../../utils/prisma'

export default defineEventHandler(async (event) => {
  try {
    const id = parseInt(getRouterParam(event, 'id') || '0')
    if (!id) throw createError({ statusCode: 400, statusMessage: 'Yalnış ID' })
    await prisma.giftCard.delete({ where: { id } })
    return { success: true, message: 'Silindi' }
  } catch (error) {
    throw createError({ statusCode: 500, statusMessage: 'Silinərkən xəta baş verdi' })
  }
})
