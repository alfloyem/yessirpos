import prisma from './prisma'
import { messaging } from './firebase'

export interface CreateNotificationDTO {
  type: string
  title: string
  message?: string
  data?: any
}

export const createNotification = async (payload: CreateNotificationDTO) => {
  try {
    const notification = await (prisma as any).notification.create({
      data: {
        type: payload.type,
        title: payload.title,
        message: payload.message || null,
        data: payload.data ? JSON.stringify(payload.data) : null,
      }
    })
    
    // In the future, this is where we'll hook into Web Push, Telegram, Discord integrations
    await emitRealtimeNotification(notification, payload)
    
    return notification
  } catch (error) {
    console.error('Failed to create notification', error)
    return null
  }
}

// Stub for realtime emissions (WebSocket / SSE / Polling hooks)
const emitRealtimeNotification = async (notification: any, payload: CreateNotificationDTO) => {
  // TODO: Trigger actual web push or websocket broadcast here
  if (messaging) {
    try {
      const users = await prisma.employee.findMany()
      const allTokens = users.map((u: any) => {
        try {
          return u.fcmTokens ? JSON.parse(u.fcmTokens) : []
        } catch(e) { return [] }
      }).flat()

      const uniqueTokens = [...new Set(allTokens)]

      if (uniqueTokens.length > 0) {
        await messaging.sendEachForMulticast({
          tokens: uniqueTokens as string[],
          notification: {
            title: payload.title,
            body: payload.message
          },
          data: {
            type: payload.type,
            notificationId: String(notification.id)
          }
        })
        console.log(`Push notification sent to ${uniqueTokens.length} devices`)
      }
    } catch (error) {
      console.error('FCM Broadcast Error:', error)
    }
  }
}
