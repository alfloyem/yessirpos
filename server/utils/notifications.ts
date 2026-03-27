import prisma from './prisma'

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
    await emitRealtimeNotification(notification)
    
    return notification
  } catch (error) {
    console.error('Failed to create notification', error)
    return null
  }
}

// Stub for realtime emissions (WebSocket / SSE / Polling hooks)
const emitRealtimeNotification = async (notification: any) => {
  // Placeholder for future realtime integrations like FCM, Socket.io, or sending to a webhook
  // Currently, the client will just poll or fetch on load, but we can setup something later.
}
