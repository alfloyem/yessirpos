import { defineEventHandler, getQuery } from 'h3'
import prisma from '../../utils/prisma'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const page = Number(query.page) || 1
  const limit = Number(query.limit) || 20
  const skip = (page - 1) * limit
  
  try {
    const notifications = await (prisma as any).notification.findMany({
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: skip
    })
    
    // Total count for unread
    const unreadCount = await (prisma as any).notification.count({
      where: { isRead: false }
    })
    
    return {
      notifications,
      unreadCount
    }
  } catch (error) {
    console.error('Fetch notifications error:', error)
    return { notifications: [], unreadCount: 0 }
  }
})
