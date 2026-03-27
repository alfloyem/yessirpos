import { defineEventHandler, readBody } from 'h3'
import prisma from '../../utils/prisma'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  
  try {
    if (body && body.id) {
      // Mark specific as read
      await (prisma as any).notification.update({
        where: { id: Number(body.id) },
        data: { isRead: true }
      })
    } else {
      // Mark all as read
      await (prisma as any).notification.updateMany({
        where: { isRead: false },
        data: { isRead: true }
      })
    }
    
    return { success: true }
  } catch (error) {
    console.error('Update notification error:', error)
    return { success: false }
  }
})
